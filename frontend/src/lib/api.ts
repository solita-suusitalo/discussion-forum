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
 * Using dynamic/public so the URL is resolved at runtime, not baked in at
 * build time — required for containerised deployments where the value differs
 * per environment and is injected via Docker/Azure env vars.
 */
import { env } from "$env/dynamic/public";

type RequestOptions = Omit<RequestInit, "body" | "method">;

// createApi takes SvelteKit's fetch (or falls back to globalThis.fetch).
// This is the pattern SvelteKit recommends: pass `fetch` from load() so the
// framework can intercept it on the server (handles relative URLs, etc.).
export function createApi(
  fetch: typeof globalThis.fetch = globalThis.fetch,
  token?: string
) {
  const base = env.PUBLIC_API_URL
    ? `${env.PUBLIC_API_URL.replace(/\/+$/, "")}/api`
    : "http://localhost:3000/api";

  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...options.headers,
      },
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

    // ── Comments ──────────────────────────────────────────────────────────────
    getComments: (postId: number) =>
      request<import("./types").Comment[]>("GET", `/posts/${postId}/comments`),
    createComment: (postId: number, content: string) =>
      request<import("./types").Comment>("POST", `/posts/${postId}/comments`, {
        content,
      }),
    deleteComment: (postId: number, commentId: number) =>
      request<void>("DELETE", `/posts/${postId}/comments/${commentId}`),

    // ── Votes ─────────────────────────────────────────────────────────────────
    votePost: (postId: number, value: 1 | -1) =>
      request<{ userId: number; postId: number; value: number }>(
        "PUT",
        `/posts/${postId}/vote`,
        { value }
      ),
    removePostVote: (postId: number) =>
      request<void>("DELETE", `/posts/${postId}/vote`),
    voteComment: (postId: number, commentId: number, value: 1 | -1) =>
      request<{ userId: number; commentId: number; value: number }>(
        "PUT",
        `/posts/${postId}/comments/${commentId}/vote`,
        { value }
      ),
    removeCommentVote: (postId: number, commentId: number) =>
      request<void>("DELETE", `/posts/${postId}/comments/${commentId}/vote`),
  };
}

/** Thrown when the server responds with a non-2xx status */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}
