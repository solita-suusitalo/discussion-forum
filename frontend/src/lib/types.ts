/** Mirrors the Prisma Post model returned by the backend */
export interface Post {
  postId: number;
  title: string;
  content: string;
  authorId: number;
  author: { username: string };
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  _count: { comments: number };
  comments: Comment[];
  votes: { userId: number; value: number }[];
}

/** A single comment returned by the backend */
export interface Comment {
  commentId: number;
  content: string;
  postId: number;
  authorId: number;
  author: { userId: number; username: string };
  createdAt: string;
  votes: { userId: number; value: number }[];
}

/** Mirrors the Prisma User model returned by the backend */
export interface User {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
}

/** Lightweight post shape returned by GET /posts (list) */
export interface PostSummary {
  postId: number;
  title: string;
  content: string;
  authorId: number;
  author: { username: string };
  createdAt: string;
  lastActivityAt: string;
  _count: { comments: number };
}
