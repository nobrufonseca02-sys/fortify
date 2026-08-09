// Flat, static background fill — replaces the previous floating-orb /
// rotating-ring / noise-texture treatment, which was pure decoration with
// no functional purpose and didn't fit the black/white/blue system.
export function AnimatedBackground() {
  return <div className="fixed inset-0 -z-10 bg-background pointer-events-none" aria-hidden="true" />;
}
