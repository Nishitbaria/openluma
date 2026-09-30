import type { StreamdownProps } from "streamdown";

function isSameOrigin(url: string) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Streamdown settings for model output, which can echo text planted in event
 * descriptions. Images load without a click, so a planted image URL could leak
 * conversation data in its query string; they are dropped. External links
 * open only after the user confirms the full URL.
 */
export const untrustedMarkdownProps = {
  disallowedElements: ["img", "picture", "source"],
  linkSafety: { enabled: true, onLinkCheck: isSameOrigin },
} satisfies Partial<StreamdownProps>;
