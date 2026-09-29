import type { ModelName } from "./localModels";
export const localSupported = typeof Worker !== "undefined";
export const loadedModels = new Set<ModelName>();
let worker: Worker | undefined,
  sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    progress?: (text: string) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
export function stopModels() {
  worker?.terminate();
  worker = undefined;
  loadedModels.clear();
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error("Local processing stopped."));
  }
  pending.clear();
}
export async function localCall<T = unknown>(
  op: string,
  payload: any,
  progress?: (text: string) => void,
): Promise<T> {
  if (!localSupported)
    throw new Error("This browser does not support model workers.");
  if (!worker) {
    worker = new Worker("/ml/worker.js", { type: "module" });
    worker.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      if (!p) return;
      if (data.progress) {
        p.progress?.(data.progress);
        return;
      }
      clearTimeout(p.timer);
      pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result);
    };
    worker.onerror = () => stopModels();
  }
  const id = ++sequence;
  const result = await new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve,
      reject,
      progress,
      timer: setTimeout(() => stopModels(), 15 * 60 * 1000),
    });
    worker!.postMessage({ id, op, payload });
  });
  if (op === "load") loadedModels.add(payload.name);
  return result;
}
export async function decodeAudio(uri: string) {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 30 * 1024 * 1024)
    throw new Error("Use an audio file smaller than 30 MB.");
  const context = new AudioContext({ sampleRate: 16000 });
  try {
    const audio = await context.decodeAudioData(bytes);
    if (audio.duration > 180)
      throw new Error("Use a clip shorter than three minutes.");
    const mixed = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const data = audio.getChannelData(c);
      for (let i = 0; i < data.length; i++)
        mixed[i] += data[i] / audio.numberOfChannels;
    }
    return mixed;
  } finally {
    await context.close();
  }
}
export async function startLocalDictation(
  onText: (text: string) => void,
  onError: (error: unknown) => void,
) {
  if (!loadedModels.has("speech"))
    throw new Error("Load the speech model in Intelligence → Local AI first.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let stopped = false,
    recorder: MediaRecorder | undefined;
  const stop = () => {
    stopped = true;
    if (recorder?.state === "recording") recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
  };
  const listen = () => {
    if (stopped) return;
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onerror = (e) => {
      onError(e);
      stop();
    };
    recorder.onstop = async () => {
      clearTimeout(timer);
      if (stopped) return;
      const url = URL.createObjectURL(
        new Blob(chunks, { type: recorder?.mimeType }),
      );
      try {
        const audio = await decodeAudio(url);
        const result = await localCall<{ text: string }>("speech", { audio });
        if (!stopped) onText(result.text);
      } catch (e) {
        onError(e);
        stop();
      } finally {
        URL.revokeObjectURL(url);
        listen();
      }
    };
    recorder.start();
    const timer = setTimeout(() => {
      if (recorder?.state === "recording") recorder.stop();
    }, 8000);
  };
  try {
    listen();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
