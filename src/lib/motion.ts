import type { Transition, Variants } from "motion/react";

const responsiveSpring = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.78,
} satisfies Transition;

const gentleSpring = {
  type: "spring",
  stiffness: 300,
  damping: 32,
  mass: 0.9,
} satisfies Transition;

export const fortifyMotion = {
  responsive: responsiveSpring,
  gentle: gentleSpring,
  page: {
    type: "spring",
    stiffness: 340,
    damping: 36,
    mass: 0.82,
  } satisfies Transition,
  reveal: {
    type: "spring",
    stiffness: 420,
    damping: 36,
    mass: 0.72,
  } satisfies Transition,
  fade: {
    duration: 0.2,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,
  press: { scale: 0.985 },
  hover: { y: -2 },
} as const;

export const fortifyMotionConfig = {
  default: responsiveSpring,
  opacity: fortifyMotion.fade,
} satisfies Transition;

export const fortifyPageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
} satisfies Variants;
