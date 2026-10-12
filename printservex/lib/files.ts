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
