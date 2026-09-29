import { File, Paths, Directory } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Attachment } from "../database/workspace";
export async function documentPages(a: Attachment) {
  return [{ page: 1, text: await extractDocument(a) }];
}
export async function readAttachment(uri: string) {
  const file = new File(uri);
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a file smaller than 10 MB.");
  return file.base64();
}
export async function openAttachment(a: Attachment) {
  const directory = new Directory(Paths.cache, "attachments");
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(
    directory,
    `${a.noteId}-${a.id}-${a.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
  );
  file.write(a.data, { encoding: "base64" });
  await Sharing.shareAsync(file.uri, { mimeType: a.mime });
}
export async function clearAttachmentCache(noteId?: string) {
  const directory = new Directory(Paths.cache, "attachments");
  if (!directory.exists) return;
  if (!noteId) {
    directory.delete();
    return;
  }
  for (const entry of directory.list())
    if (entry instanceof File && entry.name.startsWith(noteId + "-"))
      entry.delete();
}
export async function extractDocument(a: Attachment) {
  if (a.mime !== "text/plain" && !a.name.endsWith(".md"))
    throw new Error(
      "PDF text extraction is available in the web app. Images and scanned PDFs need OCR, which is not included.",
    );
  const file = new File(Paths.cache, `${a.id}.txt`);
  file.write(a.data, { encoding: "base64" });
  const text = await file.text();
  file.delete();
  return text.slice(0, 100000);
}
