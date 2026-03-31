import { createApi } from "$lib/api";
import type { Post } from "$lib/types";
import type { PageLoad } from "./$types";

// SvelteKit passes a `fetch` argument to every load function.
// This is a special version of fetch that knows about the current request
// (cookies, server-side context). Always use it instead of globalThis.fetch.
export const load: PageLoad = async ({ fetch }) => {
  const api = createApi(fetch);
  const posts = await api.get<Post[]>("/posts");
  return {
    summaries: posts.map((post) => ({
      id: post.postId,
      title: post.title,
      content: post.content,
      author: post.author.username,
      createdAt: post.createdAt,
    })),
  };
};
