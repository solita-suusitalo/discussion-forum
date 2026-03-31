/** Mirrors the Prisma Post model returned by the backend */
export interface Post {
  postId: number;
  title: string;
  content: string;
  authorId: number;
  author: { username: string };
  createdAt: string; // ISO date string over JSON
  updatedAt: string;
}

/** Mirrors the Prisma User model returned by the backend */
export interface User {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
}
