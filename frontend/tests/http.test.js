import { describe, it, expect, vi, afterEach } from "vitest";
import { request, validateAuth } from "../src/http";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("request deadlines and failures", () => {
  it("returns successful JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"ok":true}')),
    );
    expect(await request("/test")).toEqual({ ok: true });
  });
  it("keeps HTTP status for invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"Invalid email or password."}', {
            status: 401,
          }),
        ),
    );
    await expect(request("/login")).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password.",
    });
  });
  it("handles database outage", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"Database unavailable"}', { status: 503 }),
        ),
    );
    await expect(request("/login")).rejects.toMatchObject({ status: 503 });
  });
  it("reports invalid JSON from an upstream proxy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>down</html>")),
    );
    await expect(request("/test")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  it("rejects empty response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("")));
    await expect(request("/test")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  it("bounds an unresponsive backend", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      ),
    );
    const pending = expect(
      request("/login", { timeoutMs: 100 }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(101);
    await pending;
  });
  it("supports user cancellation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      ),
    );
    const controller = new AbortController();
    const pending = expect(
      request("/test", { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "CANCELLED" });
    controller.abort();
    await pending;
  });
  it("recovers on a user retry without automatic mutation retries", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    await expect(request("/test")).rejects.toMatchObject({ code: "NETWORK" });
    expect(await request("/test")).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed authentication payloads", () => {
    for (const p of [null, {}, { token: "x" }, { token: "x", user: {} }])
      expect(() => validateAuth(p)).toThrow(/invalid response/);
  });
});
it("honors the deadline while receiving the response body", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, { signal }) => ({
      ok: true,
      status: 200,
      text: () =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    })),
  );
  const pending = expect(
    request("/slow-body", { timeoutMs: 100 }),
  ).rejects.toMatchObject({ code: "TIMEOUT" });
  await vi.advanceTimersByTimeAsync(101);
  await pending;
});
