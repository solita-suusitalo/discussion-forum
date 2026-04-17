import { createApi } from "$lib/api";
import type { PostSummary } from "$lib/types";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch }) => {
  const api = createApi(fetch);
  const posts = await api.get<PostSummary[]>("/posts");
  return {
    summaries: posts.map((post) => ({
      id: post.postId,
      title: post.title,
      content: post.content,
      author: post.author.username,
      createdAt: post.createdAt,
      commentCount: post._count.comments,
    })),
  };
};
