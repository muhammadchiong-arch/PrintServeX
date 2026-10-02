import { useSyncExternalStore } from "react";

const noop = () => () => {};

// false while the page is built on the server, true once it runs in the browser.
// Use it before reading browser-only things like sessionStorage, so both renders match.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
