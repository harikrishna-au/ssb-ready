import { forcesPosts } from "./forces";
import { processPosts } from "./process";
import { psychologyPosts } from "./psychology";
import { speakingPosts } from "./speaking";
import type { Post } from "./types";

export const POSTS: Post[] = [...processPosts, ...psychologyPosts, ...speakingPosts, ...forcesPosts].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
export type { Block, Post } from "./types";
