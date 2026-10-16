import DOMPurify from "dompurify";
import type { EmailContent } from "@bcs/contracts";

export const emailFonts = ["Arial", "Verdana", "Georgia", "Times New Roman", "Tahoma", "Trebuchet MS", "Courier New"] as const;
export const emailSizes = [11, 12, 14, 16, 18, 20, 24, 28, 32] as const;
export const emailTokens = ["student_name", "course_name", "batch_name"] as const;
export const maxEmailHtml = 100_000;
const tags = ["p", "br", "strong", "b", "em", "i", "u", "s", "span", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "a"];
const policy = { ALLOWED_TAGS: tags, ALLOWED_ATTR: ["style", "href", "target", "rel"], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, FORBID_TAGS: ["svg", "math", "script", "style", "template", "form", "iframe", "img", "video", "audio"], RETURN_TRUSTED_TYPE: false as const };
export function safeEmailUrl(value: string): string | null {
  const input = value.trim();
  if ([...input].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) || input.includes("{{")) return null;
  try { const url = new URL(input); if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.href;
    if (url.protocol === "mailto:" && /^[^?<>\s@]+@[^?<>\s@]+\.[^?<>\s@]+$/.test(url.pathname) && !url.search && !url.hash) return input;
  } catch { /* Invalid or relative URLs are deliberately not accepted. */ }
  return null;
}
function safeColor(value: string) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value);
  return rgb?.slice(1).every(n => Number(n) <= 255) ? `#${rgb.slice(1).map(n => Number(n).toString(16).padStart(2,"0")).join("")}` : "";
}
/** All imports, paste, storage and previews use this boundary. Never returns raw input on SSR. */
export function sanitizeEmailHtml(input: string): string {
  if (typeof document === "undefined") return "";
  if (input.length > maxEmailHtml) throw new Error("Email body exceeds the 100,000-character demo limit.");
  const clean = DOMPurify.sanitize(input, policy);
  const template = document.createElement("template"); template.innerHTML = clean;
  for (const element of template.content.querySelectorAll<HTMLElement>("*")) {
    const style = element.style; const allowed: string[] = [];
    for (const property of ["color", "background-color"]) { const color = safeColor(style.getPropertyValue(property)); if (color) allowed.push(`${property}:${color}`); }
    const font = style.fontFamily.replace(/["']/g, "").trim();
    if (emailFonts.some(item => item.toLowerCase() === font.toLowerCase())) allowed.push(`font-family:${font}`);
    if (emailSizes.some(size => style.fontSize === `${size}px`)) allowed.push(`font-size:${style.fontSize}`);
    if (["left","center","right"].includes(style.textAlign)) allowed.push(`text-align:${style.textAlign}`);
    if (["bold","700"].includes(style.fontWeight)) allowed.push("font-weight:bold");
    if (style.fontStyle === "italic") allowed.push("font-style:italic");
    if (["underline","line-through"].includes(style.textDecoration)) allowed.push(`text-decoration:${style.textDecoration}`);
    element.removeAttribute("style"); if (allowed.length) element.setAttribute("style", allowed.join(";"));
    const href = element.tagName === "A" ? safeEmailUrl(element.getAttribute("href") ?? "") : null;
    element.removeAttribute("href"); element.removeAttribute("target"); element.removeAttribute("rel");
    if (href) { element.setAttribute("href", href); element.setAttribute("target", "_blank"); element.setAttribute("rel", "noopener noreferrer"); }
  }
  return DOMPurify.sanitize(template.innerHTML, policy);
}
export function emailContent(input: string): EmailContent {
  const html = sanitizeEmailHtml(input);
  if (typeof document === "undefined") return { version: 1, html: "", plainText: "" };
  const template = document.createElement("template"); template.innerHTML = html;
  for (const br of template.content.querySelectorAll("br")) br.replaceWith("\n");
  for (const block of template.content.querySelectorAll("p,h1,h2,h3,li,blockquote")) block.append("\n");
  return { version: 1, html, plainText: (template.content.textContent ?? "").replace(/\n{3,}/g,"\n\n").trim() };
}
export function personalizeEmail(input: string, values: Record<string, string>): EmailContent {
  const html = sanitizeEmailHtml(input);
  if (typeof document === "undefined") return emailContent("");
  const template = document.createElement("template"); template.innerHTML = html;
  // Formatting may split a token across inline text nodes. Resolve text ranges,
  // never interpolate into HTML or attributes, and never cross block boundaries.
  const groups = new Map<Node, Text[]>();
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const block = node.parentElement?.closest("p,h1,h2,h3,li,blockquote") ?? template.content;
    const nodes = groups.get(block) ?? []; nodes.push(node as Text); groups.set(block,nodes);
  }
  for (const nodes of groups.values()) {
    const text = nodes.map(node=>node.data).join("");
    for (const match of [...text.matchAll(/\{\{([a-z_]+)\}\}/g)].reverse()) {
      if (!Object.hasOwn(values,match[1])) continue;
      let offset=0; const range=document.createRange(); const start=match.index, end=start+match[0].length;
      for (const node of nodes) { const length=node.length;
        if (start>=offset && start<offset+length) range.setStart(node,start-offset);
        if (end>offset && end<=offset+length) { range.setEnd(node,end-offset); break; }
        offset+=length;
      }
      range.deleteContents(); range.insertNode(document.createTextNode(values[match[1]]));
    }
  }
  return emailContent(template.innerHTML);
}
export function unknownEmailTokens(content: EmailContent): string[] { return [...new Set((content.plainText.match(/\{\{[^{}]+\}\}/g) ?? []).filter(token => !emailTokens.some(key => token === `{{${key}}}`)))]; }
