"use client";
import { motion } from "motion/react";

// Rolls each letter over to reveal a copy of itself. Based on the motion-primitives TextRoll.
// Differences: letters are grouped by word so long headlines wrap normally, numbers can be
// passed from server components, and reduced-motion users see plain text (see globals.css).
const DEFAULT_VARIANTS = {
  enter: { initial: { rotateX: 0 }, animate: { rotateX: 90 } },
  exit: { initial: { rotateX: 90 }, animate: { rotateX: 0 } },
};

export function TextRoll({
  children,
  duration = 0.5,
  stagger = 0.1,       // seconds between one letter and the next
  exitOffset = 0.2,    // extra seconds before the incoming copy starts
  getEnterDelay,       // optional functions, usable from client components only
  getExitDelay,
  className,
  transition = { ease: "easeIn" },
  variants = DEFAULT_VARIANTS,
  onAnimationComplete,
}) {
  const enterDelay = getEnterDelay || ((i) => i * stagger);
  const exitDelay = getExitDelay || ((i) => i * stagger + exitOffset);
  const words = children.split(" ");
  const last = children.replace(/ /g, "").length - 1;
  let index = 0;

  return (
    <span className={className}>
      {words.map((word, w) => (
        <span key={w}>
          <span className="inline-block whitespace-nowrap">
            {word.split("").map((letter) => {
              const i = index++;
              return (
                <span key={i} aria-hidden="true" className="relative inline-block [perspective:10000px] [transform-style:preserve-3d]">
                  <motion.span
                    className="text-roll-layer absolute inline-block [backface-visibility:hidden] [transform-origin:50%_25%]"
                    initial={variants.enter.initial}
                    animate={variants.enter.animate}
                    transition={{ ...transition, duration, delay: enterDelay(i) }}
                  >
                    {letter}
                  </motion.span>
                  <motion.span
                    className="text-roll-layer absolute inline-block [backface-visibility:hidden] [transform-origin:50%_100%]"
                    initial={variants.exit.initial}
                    animate={variants.exit.animate}
                    transition={{ ...transition, duration, delay: exitDelay(i) }}
                    onAnimationComplete={i === last ? onAnimationComplete : undefined}
                  >
                    {letter}
                  </motion.span>
                  <span className="text-roll-size invisible">{letter}</span>
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
      <span className="sr-only">{children}</span>
    </span>
  );
}
