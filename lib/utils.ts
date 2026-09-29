import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCAL_BASE = "http://local.invalid";

/**
 * True when `value` is a same-origin path. Resolves it the way a browser does,
 * so `//host`, `/\host` and `/<tab>/host` (backslashes become slashes, tabs and
 * newlines are stripped) are all rejected as cross-origin.
 */
export function isLocalPath(value: string) {
  if (!value.startsWith("/")) {
    return false;
  }
  try {
    return new URL(value, LOCAL_BASE).origin === LOCAL_BASE;
  } catch {
    return false;
  }
}
