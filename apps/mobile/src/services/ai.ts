import { requests, responses, type Route } from "@veynoa/ai-contracts";
import type { Settings } from "@veynoa/domain";
import type { z } from "zod";
import { AIRequestError, retryAfter } from "@veynoa/domain/src/retry";
const active = new Set<AbortController>();
export function gatewayOrigin(address: string) {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new AIRequestError("Add your AI gateway URL in Settings.", false);
  }
  if (url.username || url.password)
    throw new AIRequestError(
      "Use a gateway URL without embedded credentials.",
      false,
    );
  if (
    url.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new AIRequestError("The gateway must use HTTPS.", false);
  return url.origin;
}
export async function checkGateway(address: string) {
  const origin = gatewayOrigin(address);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(origin + "/v1/health", {
      signal: controller.signal,
    });
    const body = (await response.json()) as {
      service?: string;
      ready?: boolean;
    };
    if (!response.ok || body.service !== "veynoa" || !body.ready)
      throw new Error(
        "The gateway is reachable but not ready. Check its AI and rate-limit bindings.",
      );
    return "Connected. Gateway configuration is ready.";
  } finally {
    clearTimeout(timer);
  }
}
export function cancelInference() {
  active.forEach((c) => c.abort());
  active.clear();
}
export async function infer<R extends Route>(
  route: R,
  payload: z.input<(typeof requests)[R]>,
  settings: Settings,
): Promise<z.output<(typeof responses)[R]>> {
  if (settings.localOnly)
    throw new AIRequestError(
      "Cloud AI is off. Enable it in Settings to use this feature.",
      true,
      0,
      true,
    );
  const origin = gatewayOrigin(settings.gatewayUrl);
  const controller = new AbortController();
  active.add(controller);
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 60_000);
  try {
    const parsed = requests[route].safeParse(payload);
    if (!parsed.success)
      throw new AIRequestError(
        "This content is too large or incomplete for AI processing. Shorten it and try again.",
        false,
      );
    const res = await fetch(`${origin}/v1/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Installation-Id": settings.installationId,
      },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    });
    if (!res.ok)
      throw new AIRequestError(
        res.status === 429
          ? "AI limit reached. Try again later."
          : res.status === 413
            ? "This recording is too large. Try shorter segments."
            : `AI request failed (${res.status}).`,
        res.status === 408 || res.status === 429 || res.status >= 500,
        retryAfter(res.headers.get("Retry-After")),
        false,
        res.headers.get("X-Request-Id") || undefined,
      );
    return responses[route].parse(await res.json()) as z.output<
      (typeof responses)[R]
    >;
  } catch (error) {
    if (controller.signal.aborted)
      throw new AIRequestError(
        timedOut
          ? "AI took too long. Your work is safe; we’ll retry."
          : "AI processing paused.",
        true,
        0,
        !timedOut,
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    active.delete(controller);
  }
}
