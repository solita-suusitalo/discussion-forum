/**
 * Thin wrapper around fetch for talking to the Express backend.
 *
 * Usage (inside a SvelteKit load function — preferred):
 *   const api = createApi(fetch);   // pass SvelteKit's fetch
 *   const posts = await api.get<Post[]>('/posts');
 *
 * Usage (inside a component — client only):
 *   const api = createApi();        // falls back to globalThis.fetch
 *   const post = await api.post('/posts', { title, content });
 *
 * The base URL is read from the PUBLIC_API_URL env variable so it works in
 * both development (http://localhost:3000) and production (Azure container URL).
 * SvelteKit exposes PUBLIC_* variables to both server and client code.
 */
import { PUBLIC_API_URL } from "$env/static/public";

const BASE = `${PUBLIC_API_URL}/api`;

type RequestOptions = Omit<RequestInit, "body" | "method">;

// createApi takes SvelteKit's fetch (or falls back to globalThis.fetch).
// This is the pattern SvelteKit recommends: pass `fetch` from load() so the
// framework can intercept it on the server (handles cookies, relative URLs, etc.).
export function createApi(fetch: typeof globalThis.fetch = globalThis.fetch) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // send the session cookie the backend sets
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      const message = errorBody?.error ?? res.statusText;
      throw new ApiError(message, res.status);
    }

    // 204 No Content — nothing to parse
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, undefined, options),
    post: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>("POST", path, body, options),
    put: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>("PUT", path, body, options),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>("DELETE", path, undefined, options),
  };
}

/** Thrown when the server responds with a non-2xx status */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
