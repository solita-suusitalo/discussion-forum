import { createApi, ApiError } from "$lib/api";
import type { Post } from "$lib/types";
import type { PageLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ fetch, params }) => {
  const api = createApi(fetch);
  try {
    const post = await api.get<Post>(`/posts/${params.id}`);
    return { post };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw error(404, "Post not found");
    }
    throw error(500, "Failed to load post");
  }
};
