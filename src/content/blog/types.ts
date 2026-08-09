import type { ComponentType } from "react";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
}

export interface BlogPostModule {
  meta: BlogPostMeta;
  default: ComponentType;
}
