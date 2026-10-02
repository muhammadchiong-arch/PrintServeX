import { UPLOAD_RULES } from "@/lib/shop";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "jpg", "jpeg", "png"];
const MAX_BYTES = UPLOAD_RULES.maxFileMb * 1024 * 1024;

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// Checks one file by its name and size. The browser AND the server use this same rule.
// Returns an error message, or null if the file is OK.
export function checkFileMeta(name: string, size: number): string | null {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(name))) {
    return `${name} can't be printed. Upload ${UPLOAD_RULES.fileTypes.slice(0, -1).join(", ")} or ${UPLOAD_RULES.fileTypes.at(-1)}.`;
  }
  if (size > MAX_BYTES) {
    return `${name} is ${formatFileSize(size)}. Files must be ${UPLOAD_RULES.maxFileMb} MB or smaller.`;
  }
  if (size <= 0) {
    return `${name} is empty. Please choose another file.`;
  }
  return null;
}

export const checkFile = (file: File): string | null => checkFileMeta(file.name, file.size);

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

/**
 * Reads the file in the browser (with progress) and guesses its page count.
 * - Images: 1 page.
 * - PDF: counts the pages listed inside the file. Works for most PDFs.
 * - DOCX or a PDF we can't read: returns null, and the customer types the page count.
 * Staff check the real page count before confirming the final price.
 */
export function readPageCount(file: File, onProgress: (percent: number) => void): Promise<number | null> {
  if (isImage(file.name)) {
    onProgress(100);
    return Promise.resolve(1);
  }
  if (extensionOf(file.name) !== "pdf") {
    onProgress(100);
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      onProgress(100);
      const text = typeof reader.result === "string" ? reader.result : "";
      // Each page in a PDF is an object marked "/Type /Page" ("/Pages" is the list, so skip it)
      const count = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
      resolve(count > 0 ? count : null);
    };
    // "latin1" keeps every byte as one character, so the search works on binary files
    reader.readAsText(file, "latin1");
  });
}
