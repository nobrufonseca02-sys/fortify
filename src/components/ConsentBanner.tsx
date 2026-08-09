import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hasStoredConsentChoice, setMarketingConsent } from "@/lib/analytics";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasStoredConsentChoice());
  }, []);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setMarketingConsent(granted);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur px-4 py-4 shadow-2xl shadow-black/30 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos cookies para medir o desempenho do site e das nossas campanhas de marketing. Você pode aceitar ou recusar.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose(false)}>
            Recusar
          </Button>
          <Button size="sm" onClick={() => choose(true)}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
