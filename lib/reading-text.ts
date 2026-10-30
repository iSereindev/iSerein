import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Nodes } from "mdast";

const parser = unified().use(remarkParse);

function plainNode(node: Nodes): string {
  if (node.type === "html") return "";
  if (node.type === "image") return node.alt || "";
  if ("value" in node) return node.value;
  if ("children" in node) {
    const separator = ["root", "list", "listItem", "blockquote"].includes(node.type) ? " " : "";
    return node.children.map(plainNode).join(separator);
  }
  return "";
}

// Parse previews as text; do not expose raw HTML or formatting markers.
export function readingText(markdown: string): string {
  return plainNode(parser.parse(markdown)).replace(/\s+/g, " ").trim();
}

export function readingDescription(content: string, subtitle?: string | null): string {
  const text = readingText(subtitle || content);
  if (text.length <= 160) return text;
  const excerpt = text.slice(0, 157).replace(/\s+\S*$/, "");
  return `${excerpt || text.slice(0, 157)}…`;
}
