import { motion } from 'motion/react';

function GlobeLine({ rotation, delay }: { rotation: number; delay: number }) {
  return (
    <motion.ellipse
      cx="200"
      cy="200"
      rx="140"
      ry="45"
      fill="none"
      stroke="hsl(200, 100%, 50%)"
      strokeWidth="0.6"
      strokeDasharray="4 6"
      opacity="0.3"
      transform={`rotate(${rotation} 200 200)`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.1, 0.35, 0.1] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function DataPoint({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r="2"
      fill="hsl(200, 100%, 50%)"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.8, 0], scale: [0, 1.5, 0] }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function ConnectionLine({ x1, y1, x2, y2, delay }: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="hsl(200, 100%, 50%)"
      strokeWidth="0.4"
      strokeDasharray="2 4"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.25, 0] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function GlobeAnimation() {
  const points = [
    { cx: 160, cy: 120 }, { cx: 250, cy: 140 }, { cx: 180, cy: 200 },
    { cx: 230, cy: 260 }, { cx: 140, cy: 250 }, { cx: 270, cy: 180 },
    { cx: 200, cy: 160 }, { cx: 160, cy: 290 }, { cx: 250, cy: 230 },
    { cx: 130, cy: 170 }, { cx: 280, cy: 150 }, { cx: 210, cy: 280 },
  ];

  const connections = [
    { x1: 160, y1: 120, x2: 250, y2: 140 },
    { x1: 250, y1: 140, x2: 270, y2: 180 },
    { x1: 180, y1: 200, x2: 230, y2: 260 },
    { x1: 140, y1: 250, x2: 200, y2: 160 },
    { x1: 130, y1: 170, x2: 180, y2: 200 },
    { x1: 280, y1: 150, x2: 250, y2: 230 },
    { x1: 210, y1: 280, x2: 160, y2: 290 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Glow behind globe */}
      <div className="absolute w-[350px] h-[350px] rounded-full bg-primary/5 blur-[80px]" />
      
      <motion.svg
        viewBox="0 0 400 400"
        className="w-[420px] h-[420px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {/* Main circle */}
        <circle cx="200" cy="200" r="145" fill="none" stroke="hsl(200, 100%, 50%)" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.25" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="hsl(200, 100%, 50%)" strokeWidth="0.3" opacity="0.1" />
        
        {/* Latitude lines */}
        {[0, 30, 60, 90, 120, 150].map((rot, i) => (
          <GlobeLine key={rot} rotation={rot} delay={i * 0.8} />
        ))}

        {/* Vertical meridians */}
        {[0, 45, 90, 135].map((rot, i) => (
          <motion.ellipse
            key={`v-${rot}`}
            cx="200"
            cy="200"
            rx="45"
            ry="140"
            fill="none"
            stroke="hsl(200, 100%, 50%)"
            strokeWidth="0.5"
            strokeDasharray="3 7"
            opacity="0.2"
            transform={`rotate(${rot} 200 200)`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.08, 0.22, 0.08] }}
            transition={{ duration: 6, delay: i * 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Connection lines */}
        {connections.map((c, i) => (
          <ConnectionLine key={i} {...c} delay={i * 0.6} />
        ))}

        {/* Data points */}
        {points.map((p, i) => (
          <DataPoint key={i} {...p} delay={i * 0.4} />
        ))}
      </motion.svg>

      {/* Outer ring */}
      <motion.div
        className="absolute w-[460px] h-[460px] rounded-full border border-dashed border-primary/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
