export class ApiError extends Error {
  constructor(message, status = 0, code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// The deadline covers headers AND the body. Mutations are never retried automatically.
export async function request(
  url,
  { timeoutMs = 20000, signal, ...options } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const body = await response.text();
    let data;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      throw new ApiError(
        "The service returned an unreadable response. Please try again.",
        response.status,
        "INVALID_RESPONSE",
      );
    }
    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : null;
      throw new ApiError(
        data?.error ||
          detail ||
          (response.status >= 500
            ? "This service is temporarily unavailable. Please try again."
            : `Request failed (${response.status}).`),
        response.status,
      );
    }
    if (data === null || typeof data !== "object")
      throw new ApiError(
        "The service returned an empty response. Please try again.",
        0,
        "INVALID_RESPONSE",
      );
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new ApiError(
        signal?.aborted
          ? "Request cancelled."
          : "The service is taking too long. It may be starting up. Please try again.",
        0,
        signal?.aborted ? "CANCELLED" : "TIMEOUT",
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Unable to reach the service. Check your connection and try again.",
      0,
      "NETWORK",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function validateAuth(payload) {
  if (
    !payload?.token ||
    typeof payload.token !== "string" ||
    !payload?.user?.id ||
    !payload.user.username
  ) {
    throw new ApiError(
      "The sign-in service returned an invalid response. Please try again.",
      0,
      "INVALID_RESPONSE",
    );
  }
  return payload;
}
