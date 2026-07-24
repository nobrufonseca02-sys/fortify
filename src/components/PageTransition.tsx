import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { fortifyMotion, fortifyPageVariants } from "@/lib/motion";

/**
 * Subtle, premium page transition. Pure presentational wrapper —
 * does not touch routing, data, or business logic.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={fortifyPageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{
          default: fortifyMotion.page,
          opacity: fortifyMotion.fade,
        }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
