import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BlogHeader, BlogFooter } from "@/components/blog/BlogChrome";
import { blogPosts } from "@/content/blog";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogIndex() {
  useDocumentMeta({
    title: "Blog FORTIFY — regras de risco de prop firms",
    description: "Comparativos e guias sobre regras de perda diária, drawdown e conformidade das principais prop firms, direto do catálogo auditado do Fortify.",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogHeader />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="eyebrow mb-2">Blog</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Regras de risco, sem letra miúda</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Comparativos e guias sobre as regras reais de perda diária, drawdown e conformidade das
          prop firms já auditadas no Fortify.
        </p>

        <div className="mt-10 space-y-6">
          {blogPosts.map((post) => (
            <Link
              key={post.meta.slug}
              to={`/blog/${post.meta.slug}`}
              className="group block rounded-xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-[hsl(var(--surface-1))] sm:p-6"
            >
              <p className="text-xs text-muted-foreground">{formatDate(post.meta.publishedAt)}</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{post.meta.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.meta.description}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Ler artigo
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
