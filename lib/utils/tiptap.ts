interface TiptapNode {
  content?: TiptapNode[];
  text?: string;
  type: string;
}

export function extractPlainText(richDescription: string): string {
  try {
    const doc = JSON.parse(richDescription) as TiptapNode;
    const lines: string[] = [];

    function walk(node: TiptapNode) {
      if (node.type === "text" && node.text) {
        lines.push(node.text);
      }
      if (node.content) {
        const blockTypes = [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "blockquote",
        ];
        const isBlock = blockTypes.includes(node.type);
        if (isBlock && lines.length > 0) {
          lines.push(" ");
        }
        for (const child of node.content) {
          walk(child);
        }
      }
    }

    walk(doc);
    return lines.join("").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
