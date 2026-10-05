// Checks that a file really is the type its name says, from its first bytes ("magic numbers").
// A renamed file (e.g. virus.exe → photo.jpg) has the wrong first bytes, so it is refused.
// Pure function: the server reads the first 1024 bytes and calls this (lib/order-actions.ts).

import { extensionOf } from "@/lib/files";

const startsWith = (bytes: Uint8Array, sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
// PDF readers accept "%PDF" anywhere in the first 1024 bytes (some files start with a line break or BOM)
const PDF = [0x25, 0x50, 0x44, 0x46];
const hasPdfHeader = (bytes: Uint8Array) => {
  for (let at = 0; at + PDF.length <= Math.min(bytes.length, 1024); at++) if (startsWith(bytes, PDF, at)) return true;
  return false;
};

const SIGNATURES: Record<string, number[][]> = {
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // a DOCX is a ZIP file
};

// true = the first bytes match the file's extension
export function matchesExtension(fileName: string, firstBytes: Uint8Array): boolean {
  if (extensionOf(fileName) === "pdf") return hasPdfHeader(firstBytes);
  const sigs = SIGNATURES[extensionOf(fileName)];
  return Boolean(sigs?.some((sig) => startsWith(firstBytes, sig)));
}
