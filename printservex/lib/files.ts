import { fileTypesText, type Service } from "@/lib/services";
import { UPLOAD_RULES } from "@/lib/shop";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "jpg", "jpeg", "png"];
const MAX_BYTES = UPLOAD_RULES.maxFileMb * 1024 * 1024;

export const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// Checks one file by its name and size. The browser AND the server use this same rule.
// With a service, only that service's file types are allowed (e.g. JPG or PNG for ID photos).
// Returns an error message, or null if the file is OK.
export function checkFileMeta(name: string, size: number, service?: Pick<Service, "name" | "fileTypes">): string | null {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(name))) {
    return `${name} can't be printed. Upload ${UPLOAD_RULES.fileTypes.slice(0, -1).join(", ")} or ${UPLOAD_RULES.fileTypes.at(-1)}.`;
  }
  if (service && !service.fileTypes.includes(extensionOf(name))) {
    return `${name} isn't supported for ${service.name}. Upload a ${fileTypesText(service.fileTypes)} file.`;
  }
  if (size > MAX_BYTES) {
    return `${name} is ${formatFileSize(size)}. Files must be ${UPLOAD_RULES.maxFileMb} MB or smaller.`;
  }
  if (size <= 0) {
    return `${name} is empty. Please choose another file.`;
  }
  return null;
}

export const checkFile = (file: File, service?: Pick<Service, "name" | "fileTypes">): string | null => checkFileMeta(file.name, file.size, service);

// The file type sent to Storage. Set from the extension, because some phones leave it empty.
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};
export const contentTypeFor = (name: string): string => CONTENT_TYPES[extensionOf(name)] ?? "application/octet-stream";

// 3_250_000 → "3.1 MB", 48_000 → "47 KB"
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function isImage(name: string): boolean {
  return ["jpg", "jpeg", "png"].includes(extensionOf(name));
}

// Reads the whole file in the browser, reporting progress as it goes
function readFile<T extends "text" | "buffer">(file: File, as: T, onProgress: (percent: number) => void): Promise<(T extends "text" ? string : ArrayBuffer) | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      onProgress(100);
      resolve(reader.result as (T extends "text" ? string : ArrayBuffer) | null);
    };
    // "latin1" keeps every byte as one character, so text searches work on binary files
    if (as === "text") reader.readAsText(file, "latin1");
    else reader.readAsArrayBuffer(file);
  });
}

// PDF: each page is an object marked "/Type /Page" ("/Pages" is the list, so skip it)
function pdfPageCount(text: string): number | null {
  const count = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
  return count > 0 ? count : null;
}

/**
 * DOCX: a .docx file is a zip. Word saves the page count in docProps/app.xml as <Pages>12</Pages>.
 * We find that one entry in the zip and unpack it with the browser's own DecompressionStream.
 * Returns null if the file has no page count (e.g. some exports from Google Docs).
 */
async function docxPageCount(buffer: ArrayBuffer): Promise<number | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // The zip's table of contents ends with this record, near the end of the file
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;

  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < entries && at + 46 <= bytes.length; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) return null;
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const skip = nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    const localHeader = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));

    if (name === "docProps/app.xml") {
      const start = localHeader + 30 + view.getUint16(localHeader + 26, true) + view.getUint16(localHeader + 28, true);
      const packed = bytes.subarray(start, start + size);
      let xml: string;
      if (method === 0) xml = decoder.decode(packed); // stored as is
      else if (method === 8 && typeof DecompressionStream !== "undefined") {
        const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        xml = await new Response(stream).text();
      } else return null;
      const pages = Number(xml.match(/<Pages>(\d+)<\/Pages>/)?.[1]);
      return Number.isInteger(pages) && pages > 0 ? pages : null;
    }
    at += 46 + skip;
  }
  return null;
}

/**
 * Reads the file in the browser (with progress) and counts its pages for the estimate.
 * - Images: 1 page.
 * - PDF: counts the pages listed inside the file. Works for most PDFs.
 * - DOCX: the page count Word saved in the file (as of its last save in Word).
 * - Anything we can't read: returns null, and the customer types the page count.
 * Staff check the real page count before confirming the final price.
 */
export async function readPageCount(file: File, onProgress: (percent: number) => void): Promise<number | null> {
  const ext = extensionOf(file.name);
  if (isImage(file.name)) {
    onProgress(100);
    return 1;
  }
  try {
    if (ext === "pdf") {
      const text = await readFile(file, "text", onProgress);
      return text ? pdfPageCount(text) : null;
    }
    if (ext === "docx") {
      const buffer = await readFile(file, "buffer", onProgress);
      return buffer ? await docxPageCount(buffer) : null;
    }
  } catch {
    // A broken or unusual file: let the customer type the page count
  }
  onProgress(100);
  return null;
}
