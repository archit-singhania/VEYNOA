import { copyFile, mkdir, readdir } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const destination = new URL("apps/mobile/public/", root);
await mkdir(destination, { recursive: true });
await copyFile(
  new URL("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", root),
  new URL("pdf.worker.min.mjs", destination),
);
console.log("Prepared local PDF worker.");
const ml = new URL("ml/", destination);
await mkdir(ml, { recursive: true });
await build({
  entryPoints: [
    fileURLToPath(new URL("apps/mobile/src/workers/local-models.mjs", root)),
  ],
  outfile: fileURLToPath(new URL("worker.js", ml)),
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
});
for (const folder of ["onnxruntime-web/dist/", "tesseract.js-core/"]) {
  const source = new URL("node_modules/" + folder, root);
  for (const name of await readdir(source))
    if (
      name.endsWith(".wasm") ||
      (name.endsWith(".mjs") && name.startsWith("ort-wasm")) ||
      name.endsWith(".wasm.js")
    )
      await copyFile(new URL(name, source), new URL(name, ml));
}
await copyFile(
  new URL("node_modules/tesseract.js/dist/worker.min.js", root),
  new URL("tesseract.worker.min.js", ml),
);
console.log(
  "Prepared local inference and OCR workers (model weights download only on request).",
);
