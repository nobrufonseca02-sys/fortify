import { useEffect } from "react";

interface DocumentMeta {
  title: string;
  description: string;
  /** Caminho da página, para a canônica e a og:url. Ex.: "/vendas/planos". */
  path?: string;
}

const DEFAULT_TITLE = "FORTIFY — Controle de Risco para Traders";
const DEFAULT_DESCRIPTION = "Sistema de controle de risco e conformidade para traders de prop firms";

function setMetaContent(name: string, content: string, attr: "name" | "property" = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * A URL canônica sai da origem em tempo de execução, e não de uma constante.
 *
 * O domínio de produção ainda pode mudar (hoje é o da Vercel). Uma origem
 * fixa no código apontaria para o lugar errado no dia da troca, e canônica
 * errada é pior que canônica ausente: manda o Google indexar outro endereço.
 */
function setCanonical(path: string) {
  const href = `${window.location.origin}${path}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
  setMetaContent("og:url", href, "property");
}

/** Overrides the document title and description meta tags while mounted, resetting to the app defaults on unmount. */
export function useDocumentMeta({ title, description, path }: DocumentMeta) {
  useEffect(() => {
    document.title = title;
    setMetaContent("description", description);
    setMetaContent("og:title", title, "property");
    setMetaContent("og:description", description, "property");
    setMetaContent("twitter:title", title);
    setMetaContent("twitter:description", description);
    if (path) setCanonical(path);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent("description", DEFAULT_DESCRIPTION);
      setMetaContent("og:title", DEFAULT_TITLE, "property");
      setMetaContent("og:description", DEFAULT_DESCRIPTION, "property");
      setMetaContent("twitter:title", DEFAULT_TITLE);
      setMetaContent("twitter:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description, path]);
}
