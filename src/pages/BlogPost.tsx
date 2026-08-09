import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogHeader, BlogFooter } from "@/components/blog/BlogChrome";
import { getBlogPostBySlug } from "@/content/blog";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  useDocumentMeta({
    title: post ? `${post.meta.title} — FORTIFY` : "Artigo não encontrado — FORTIFY",
    description: post?.meta.description ?? "Este artigo não foi encontrado no blog do Fortify.",
  });

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const Content = post.default;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todos os artigos
        </Link>

        <article className="mt-6">
          <p className="text-xs text-muted-foreground">{formatDate(post.meta.publishedAt)}</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">{post.meta.title}</h1>

          <div className="prose prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-strong:text-foreground mt-8 max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground">
            <Content />
          </div>
        </article>

        <div className="mt-12 flex flex-col items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">Veja essas regras aplicadas na sua própria conta.</p>
            <p className="mt-1 text-sm text-muted-foreground">Conecte um MT5 e acompanhe os limites em tempo real, de graça.</p>
          </div>
          <Button asChild className="shrink-0 gap-1.5">
            <Link to="/auth">
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
