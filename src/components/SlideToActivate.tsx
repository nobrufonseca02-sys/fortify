import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideToActivateProps {
  onActivate?: () => void;
  label?: string;
  activatedLabel?: string;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "destructive" | "success";
}

/**
 * Drag-to-activate control inspired by premium SaaS interactions.
 * Pure presentational — caller wires onActivate to whatever action it wants.
 */
export function SlideToActivate({
  onActivate,
  label = "Deslize para ativar",
  activatedLabel = "Ativado",
  className,
  disabled = false,
  variant = "primary",
}: SlideToActivateProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [activated, setActivated] = useState(false);
  const [width, setWidth] = useState(0);

  const handleSize = 44;
  const max = Math.max(0, width - handleSize - 4);

  const progress = useTransform(x, [0, max || 1], [0, 1]);
  const labelOpacity = useTransform(progress, [0, 0.6], [1, 0]);
  const fillWidth = useTransform(x, (v) => `${v + handleSize / 2}px`);

  const colors = {
    primary: "from-primary/40 to-primary/10",
    destructive: "from-destructive/45 to-destructive/10",
    success: "from-success/45 to-success/10",
  }[variant];

  const handleColor = {
    primary: "bg-primary text-primary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    success: "bg-success text-success-foreground",
  }[variant];

  return (
    <div
      ref={(el) => {
        trackRef.current = el;
        if (el) setWidth(el.offsetWidth);
      }}
      className={cn(
        "relative h-12 w-full rounded-full border border-border bg-secondary/60 backdrop-blur overflow-hidden select-none",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <motion.div
        className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full", colors)}
        style={{ width: fillWidth }}
      />

      <motion.span
        style={{ opacity: labelOpacity }}
        className="absolute inset-0 flex items-center justify-center text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground pointer-events-none"
      >
        {activated ? activatedLabel : label}
      </motion.span>

      <motion.div
        drag={activated ? false : "x"}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() > max * 0.92) {
            animate(x, max, { duration: 0.2 });
            setActivated(true);
            onActivate?.();
            setTimeout(() => {
              animate(x, 0, { duration: 0.4, delay: 0.6 });
              setActivated(false);
            }, 1400);
          } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
          }
        }}
        className={cn(
          "absolute top-[2px] left-[2px] h-11 w-11 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg shadow-black/40",
          handleColor,
        )}
      >
        {activated ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
      </motion.div>
    </div>
  );
}
