import { useEffect } from "react";

interface DocumentMeta {
  title: string;
  description: string;
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

/** Overrides the document title and description meta tags while mounted, resetting to the app defaults on unmount. */
export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    document.title = title;
    setMetaContent("description", description);
    setMetaContent("og:title", title, "property");
    setMetaContent("og:description", description, "property");
    setMetaContent("twitter:title", title);
    setMetaContent("twitter:description", description);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent("description", DEFAULT_DESCRIPTION);
      setMetaContent("og:title", DEFAULT_TITLE, "property");
      setMetaContent("og:description", DEFAULT_DESCRIPTION, "property");
      setMetaContent("twitter:title", DEFAULT_TITLE);
      setMetaContent("twitter:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
