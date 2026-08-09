import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FortifyMark } from "@/components/brand/FortifyMark";

export function BlogHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 text-foreground">
          <FortifyMark className="h-6 w-6" />
          <span className="font-display text-sm font-bold tracking-wide">FORTIFY</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Preços
          </Link>
          <Button asChild size="sm">
            <Link to="/auth" className="gap-1.5">
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          FORTIFY — controle de risco e conformidade para traders de prop firms.
        </p>
        <Link to="/blog" className="text-sm font-medium text-primary hover:underline">
          Ver todos os artigos
        </Link>
      </div>
    </footer>
  );
}
