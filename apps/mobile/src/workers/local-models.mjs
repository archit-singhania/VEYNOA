import {
  pipeline,
  env,
  AutoTokenizer,
  AutoProcessor,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
} from "@huggingface/transformers";
import { createWorker } from "tesseract.js";
env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = new URL("/ml/", self.location.origin).href;
env.backends.onnx.wasm.numThreads = 1;
const models = {};
let chain = Promise.resolve();
self.onmessage = ({ data }) => {
  chain = chain
    .then(() => handle(data))
    .catch((error) =>
      self.postMessage({ id: data.id, error: String(error?.message || error) }),
    );
};
async function handle({ id, op, payload }) {
  const progress = (p) =>
    self.postMessage({
      id,
      progress:
        typeof p === "string"
          ? p
          : (p.status || "working") +
            (p.progress ? ` ${Math.round(p.progress)}%` : ""),
    });
  if (op === "load") {
    const name = payload.name;
    if (!models[name]) {
      const options = {
        device: "wasm",
        dtype: "q8",
        progress_callback: progress,
      };
      if (name === "embed")
        models[name] = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
          options,
        );
      else if (name === "summary")
        models[name] = await pipeline(
          "text2text-generation",
          "Xenova/flan-t5-small",
          options,
        );
      else if (name === "speech")
        models[name] = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny.en",
          options,
        );
      else if (name === "vision") {
        const model = "Xenova/clip-vit-base-patch32";
        const tokenizer = await AutoTokenizer.from_pretrained(model, options);
        const processor = await AutoProcessor.from_pretrained(model, options);
        const text = await CLIPTextModelWithProjection.from_pretrained(
          model,
          options,
        );
        const image = await CLIPVisionModelWithProjection.from_pretrained(
          model,
          options,
        );
        models[name] = { tokenizer, processor, text, image };
      } else if (name === "ocr")
        models[name] = await createWorker("eng", 1, {
          workerPath: new URL(
            "/ml/tesseract.worker.min.js",
            self.location.origin,
          ).href,
          corePath: new URL("/ml/", self.location.origin).href,
          logger: progress,
        });
      else throw new Error("Unknown model");
    }
    self.postMessage({ id, result: true });
    return;
  }
  const name = op === "imageVector" || op === "textVector" ? "vision" : op;
  if (!models[name]) throw new Error(`Load the ${name} model first.`);
  let result;
  if (op === "embed")
    result = Array.from(
      (await models.embed(payload.text, { pooling: "mean", normalize: true }))
        .data,
    );
  if (op === "summary")
    result = (
      await models.summary("Summarize: " + payload.text.slice(0, 3000), {
        max_new_tokens: 160,
      })
    )[0].generated_text;
  if (op === "speech")
    result = await models.speech(payload.audio, {
      return_timestamps: true,
      chunk_length_s: 20,
      stride_length_s: 3,
    });
  if (op === "imageVector") {
    const image = await RawImage.read(payload.url);
    result = Array.from(
      (await models.vision.image(await models.vision.processor(image)))
        .image_embeds.data,
    );
  }
  if (op === "textVector")
    result = Array.from(
      (
        await models.vision.text(
          models.vision.tokenizer(payload.text, {
            padding: true,
            truncation: true,
          }),
        )
      ).text_embeds.data,
    );
  if (op === "ocr") {
    const { data } = await models.ocr.recognize(
      payload.url,
      {},
      { text: true, blocks: true },
    );
    result = {
      text: data.text,
      regions: (data.blocks || [])
        .flatMap((b) =>
          (b.paragraphs || []).flatMap((p) =>
            (p.lines || []).map((l) => ({ text: l.text, box: l.bbox })),
          ),
        )
        .slice(0, 200),
    };
  }
  self.postMessage({ id, result });
}
