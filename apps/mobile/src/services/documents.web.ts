import type { Attachment } from "../database/workspace";
export async function clearAttachmentCache(_noteId?: string) {}
export async function readAttachment(uri: string) {
  const r = await fetch(uri);
  const blob = await r.blob();
  if (blob.size > 10 * 1024 * 1024)
    throw new Error("Choose a file smaller than 10 MB.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function bytes(data: string) {
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
}
export async function openAttachment(a: Attachment) {
  const url = URL.createObjectURL(new Blob([bytes(a.data)], { type: a.mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = a.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function extractDocument(a: Attachment) {
  if (a.mime === "text/plain" || a.name.endsWith(".md"))
    return new TextDecoder().decode(bytes(a.data)).slice(0, 100000);
  if (a.mime !== "application/pdf")
    throw new Error(
      "Text extraction supports text files and text-based PDFs. Image OCR is not included.",
    );
  const pdf = await import("pdfjs-dist");
  pdf.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const document = await pdf.getDocument({
    data: bytes(a.data),
    isEvalSupported: false,
  }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(document.numPages, 100); i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((x) => ("str" in x ? x.str : "")).join(" "));
      if (pages.join("\n").length > 100000) break;
    }
    const text = pages.join("\n\n").slice(0, 100000);
    if (!text.trim())
      throw new Error("No selectable text found. This PDF may need OCR.");
    return text;
  } finally {
    await document.destroy();
  }
}
