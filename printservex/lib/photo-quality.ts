// Print-quality hints for Photo Printing. They only WARN the customer; the order is never blocked,
// because staff may still decide to print it.
import type { PhotoSize } from "@/lib/price";

// Below this many pixels per inch a print starts to look blurry
export const MIN_PPI = 150;
// More than 5% difference in shape = edges will be cropped (photos are never stretched)
const SHAPE_TOLERANCE = 0.05;

export type PhotoWarnings = {
  lowResolution: { minLong: number; minShort: number } | null; // the pixels we recommend
  shapeMismatch: boolean;
};

// Compares long side with long side, so portrait and landscape photos both work
export function photoWarnings(px: { width: number; height: number }, size: Pick<PhotoSize, "widthIn" | "heightIn">): PhotoWarnings {
  const longPx = Math.max(px.width, px.height);
  const shortPx = Math.min(px.width, px.height);
  const longIn = Math.max(size.widthIn, size.heightIn);
  const shortIn = Math.min(size.widthIn, size.heightIn);
  const minLong = Math.ceil(longIn * MIN_PPI);
  const minShort = Math.ceil(shortIn * MIN_PPI);
  const photoShape = longPx / shortPx;
  const printShape = longIn / shortIn;
  return {
    lowResolution: longPx < minLong || shortPx < minShort ? { minLong, minShort } : null,
    shapeMismatch: Math.abs(photoShape - printShape) / printShape > SHAPE_TOLERANCE,
  };
}
