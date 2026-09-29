export type ModelName = "embed" | "summary" | "speech" | "vision" | "ocr";
export const localSupported = false;
export const loadedModels = new Set<ModelName>();
export async function localCall<T = unknown>(
  _op: string,
  _payload: unknown,
  _progress?: (text: string) => void,
): Promise<T> {
  throw new Error(
    "On-device models currently require the web app. There is no automatic cloud fallback.",
  );
}
export function stopModels() {
  loadedModels.clear();
}
export async function decodeAudio(_uri: string): Promise<Float32Array> {
  throw new Error("Local audio inference currently requires the web app.");
}
export async function startLocalDictation(
  _onText: (text: string) => void,
  _onError: (error: unknown) => void,
): Promise<() => void> {
  throw new Error("Live local dictation currently requires the web app.");
}
