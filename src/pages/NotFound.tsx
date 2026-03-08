import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <p className="text-6xl font-mono font-black text-foreground mb-3">404</p>
        <h1 className="text-lg font-bold text-foreground mb-2">Pagina nao encontrada</h1>
        <p className="text-sm text-muted-foreground mb-8">A rota solicitada nao existe.</p>
        <Button onClick={() => navigate("/")} variant="premium" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
