// Counts the pages of an uploaded file. The browser uses it for the live estimate (lib/files.ts readPageCount)
// and the SERVER uses the same code again on the uploaded file (lib/order-actions.ts), so the price never
// depends on a page count typed or edited in the browser.
// - PDF: read with pdf-lib from the document's own page list (exact).
// - DOCX: the page count Word saved in the file. Word, fonts and margins can change it, so it is an ESTIMATE.
// - JPG/PNG printed as a document: 1 page.
// Anything that can't be counted is marked for staff review; a count is never guessed.

import { extensionOf, isImage } from "@/lib/files";

// detected = counted from the file · estimated = DOCX, Word's own count · review = staff must check the pages
export type PageStatus = "detected" | "estimated" | "review";
// Why staff must check: a password-protected PDF, a PDF we couldn't read, or a DOCX with no saved count
export type PageNote = "protected" | "unreadable" | "no-count";
export type PageCount = { ok: true; pages: number | null; status: PageStatus; note?: PageNote } | { ok: false; error: string };

export const PAGE_NOTES: Record<PageNote, string> = {
  protected: "Password-protected PDF: staff check that it opens",
  unreadable: "We couldn't read this PDF to count its pages",
  "no-count": "This file has no saved page count",
};

const MAX_PAGES = 2000;

async function pdfPages(bytes: Uint8Array): Promise<PageCount> {
  const { PDFDocument } = await import("pdf-lib");
  const count = (n: number): PageCount =>
    n <= 0 ? { ok: false, error: "has no pages" } : n > MAX_PAGES ? { ok: false, error: `has over ${MAX_PAGES} pages. Split it into smaller files` } : { ok: true, pages: n, status: "detected" };
  try {
    // The page list (catalog → Pages tree), so re-saved and compressed PDFs are counted right
    return count((await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount());
  } catch (e) {
    // pdf-lib's EncryptedPDFError isn't kept as its own class in its build, so check the message
    if (!(e instanceof Error && /encrypted/i.test(e.message))) return { ok: true, pages: null, status: "review", note: "unreadable" };
  }
  // Password-protected: the page list can often still be read, but staff must check the file opens
  try {
    const n = (await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })).getPageCount();
    return { ok: true, pages: n > 0 && n <= MAX_PAGES ? n : null, status: "review", note: "protected" };
  } catch {
    return { ok: true, pages: null, status: "review", note: "protected" };
  }
}

/**
 * DOCX: a .docx file is a zip. Word saves the page count in docProps/app.xml as <Pages>12</Pages>.
 * We find that one entry in the zip and unpack it with DecompressionStream (browser and Node).
 * Returns null if the file has no page count (e.g. some exports from Google Docs).
 */
async function docxSavedPages(buffer: ArrayBuffer): Promise<number | null> {
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
      return Number.isInteger(pages) && pages > 0 && pages <= MAX_PAGES ? pages : null;
    }
    at += 46 + skip;
  }
  return null;
}

export async function countPages(fileName: string, buffer: ArrayBuffer): Promise<PageCount> {
  if (isImage(fileName)) return { ok: true, pages: 1, status: "detected" };
  const ext = extensionOf(fileName);
  if (ext === "pdf") return pdfPages(new Uint8Array(buffer));
  if (ext === "docx") {
    try {
      const pages = await docxSavedPages(buffer);
      return pages !== null ? { ok: true, pages, status: "estimated" } : { ok: true, pages: null, status: "review", note: "no-count" };
    } catch {
      return { ok: true, pages: null, status: "review", note: "no-count" };
    }
  }
  return { ok: true, pages: null, status: "review", note: "unreadable" };
}

// Browser: reads the file (with progress) and counts its pages for the live estimate
export function readPageCount(file: File, onProgress: (percent: number) => void): Promise<PageCount> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 90));
    reader.onerror = () => resolve({ ok: true, pages: null, status: "review", note: "unreadable" });
    reader.onload = () => {
      countPages(file.name, reader.result as ArrayBuffer)
        .catch((): PageCount => ({ ok: true, pages: null, status: "review", note: "unreadable" }))
        .then((result) => {
          onProgress(100);
          resolve(result);
        });
    };
    reader.readAsArrayBuffer(file);
  });
}
