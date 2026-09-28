import { requests, responses, type Route } from "@veynoa/ai-contracts";
import type { Settings } from "@veynoa/domain";
import type { z } from "zod";
const active = new Set<AbortController>();
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
    throw new Error(
      "Cloud AI is off. Enable it in Settings to use this feature.",
    );
  let url: URL;
  try {
    url = new URL(settings.gatewayUrl);
  } catch {
    throw new Error("Add your AI gateway URL in Settings.");
  }
  if (
    url.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new Error("The gateway must use HTTPS.");
  const controller = new AbortController();
  active.add(controller);
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${url.origin}/v1/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Installation-Id": settings.installationId,
      },
      body: JSON.stringify(requests[route].parse(payload)),
      signal: controller.signal,
    });
    if (!res.ok)
      throw new Error(
        res.status === 429
          ? "AI limit reached. Try again later."
          : `AI request failed (${res.status}).`,
      );
    return responses[route].parse(await res.json()) as z.output<
      (typeof responses)[R]
    >;
  } finally {
    clearTimeout(timeout);
    active.delete(controller);
  }
}
