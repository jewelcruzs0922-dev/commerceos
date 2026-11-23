import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/supabase/fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchWithTimeout", () => {
  it("returns a completed response", async () => {
    globalThis.fetch = vi.fn(async () => new Response("ok"));

    const response = await fetchWithTimeout("https://example.test", {}, 1000);

    expect(await response.text()).toBe("ok");
  });

  it("aborts a hanging Supabase request", async () => {
    globalThis.fetch = vi.fn(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        })
    ) as typeof fetch;

    await expect(
      fetchWithTimeout("https://example.test", {}, 10)
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
