import * as ftmoVsFundedNext from "./ftmo-vs-fundednext";
import type { BlogPostModule } from "./types";

// Add new posts here as they're published — sorted newest first below.
const modules: BlogPostModule[] = [ftmoVsFundedNext];

export const blogPosts = [...modules].sort(
  (a, b) => new Date(b.meta.publishedAt).getTime() - new Date(a.meta.publishedAt).getTime(),
);

export function getBlogPostBySlug(slug: string): BlogPostModule | undefined {
  return blogPosts.find((post) => post.meta.slug === slug);
}
