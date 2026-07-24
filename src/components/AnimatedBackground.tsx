import { motion } from "motion/react";

function FloatingOrb({ 
  size, x, y, delay, duration, color 
}: { 
  size: number; x: string; y: string; delay: number; duration: number; color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{ width: size, height: size, left: x, top: y, background: color }}
      animate={{
        y: [0, -40, 20, -30, 0],
        x: [0, 30, -20, 10, 0],
        scale: [1, 1.15, 0.95, 1.1, 1],
        opacity: [0.15, 0.25, 0.1, 0.2, 0.15],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function GridLine({ orientation, position, delay }: { orientation: "h" | "v"; position: string; delay: number }) {
  const isH = orientation === "h";
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        [isH ? "top" : "left"]: position,
        [isH ? "left" : "top"]: 0,
        [isH ? "width" : "height"]: "100%",
        [isH ? "height" : "width"]: "1px",
        background: `linear-gradient(${isH ? "90deg" : "180deg"}, transparent, hsl(var(--primary) / 0.06), transparent)`,
      }}
      animate={{ opacity: [0, 0.5, 0] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Radial glow center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-[0.07]"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
      />

      {/* Floating orbs */}
      <FloatingOrb size={500} x="10%" y="15%" delay={0} duration={18} color="hsl(var(--primary))" />
      <FloatingOrb size={350} x="65%" y="60%" delay={3} duration={22} color="hsl(var(--info))" />
      <FloatingOrb size={250} x="80%" y="10%" delay={6} duration={15} color="hsl(187 85% 53%)" />
      <FloatingOrb size={400} x="30%" y="70%" delay={2} duration={20} color="hsl(var(--primary) / 0.5)" />
      <FloatingOrb size={200} x="50%" y="30%" delay={8} duration={25} color="hsl(260 70% 50%)" />

      {/* Animated grid lines */}
      <GridLine orientation="h" position="20%" delay={0} />
      <GridLine orientation="h" position="50%" delay={2} />
      <GridLine orientation="h" position="80%" delay={4} />
      <GridLine orientation="v" position="25%" delay={1} />
      <GridLine orientation="v" position="50%" delay={3} />
      <GridLine orientation="v" position="75%" delay={5} />

      {/* Rotating ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-info/[0.03]"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}
