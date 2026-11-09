"use client";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// Based on the motion-primitives Dock. Differences: items are real links, hover and focus both show the label,
// colours come from this site's palette, and magnification can be switched off with magnify={false}.
// Magnification is also skipped for people who ask their device for reduced motion.
const BASE = 40; // item size in pixels when nothing is hovered
const join = (...c) => c.filter(Boolean).join(" ");
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DockContext = createContext(null);
const ItemContext = createContext(null);
const useDock = () => useContext(DockContext);
const useDockItem = () => useContext(ItemContext);

export function Dock({
  children, className, label = "Quick links",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnify = true, magnification = 64, distance = 120, panelHeight = 56,
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const maxHeight = useMemo(() => (magnify ? Math.max(panelHeight, magnification + magnification / 2 + 4) : panelHeight), [magnify, magnification, panelHeight]);
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height }} className="mx-2 flex max-w-full items-end">
      <nav
        aria-label={label}
        style={{ height: panelHeight }}
        className={join("mx-auto flex w-fit items-end gap-2 rounded-lg border border-line bg-white px-3 pb-2", className)}
        onMouseMove={({ clientX }) => {
          if (!magnify || reducedMotion()) return;
          isHovered.set(1);
          mouseX.set(clientX);
        }}
        onMouseLeave={() => { isHovered.set(0); mouseX.set(Infinity); }}
      >
        <DockContext.Provider value={{ mouseX, spring, distance, magnification: magnify ? magnification : BASE }}>
          {children}
        </DockContext.Provider>
      </nav>
    </motion.div>
  );
}

export function DockItem({ children, className, href, title, active = false }) {
  const ref = useRef(null);
  const { distance, magnification, mouseX, spring } = useDock();
  const isHovered = useMotionValue(0);
  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current ? ref.current.getBoundingClientRect() : { x: 0, width: 0 };
    return val - rect.x - rect.width / 2;
  });
  const widthTransform = useTransform(mouseDistance, [-distance, 0, distance], [BASE, magnification, BASE]);
  const width = useSpring(widthTransform, spring);

  return (
    <ItemContext.Provider value={{ width, isHovered }}>
      <motion.div
        ref={ref}
        style={{ width }}
        onHoverStart={() => isHovered.set(1)}
        onHoverEnd={() => isHovered.set(0)}
        onFocus={() => isHovered.set(1)}
        onBlur={() => isHovered.set(0)}
        className={join("relative inline-flex aspect-square items-center justify-center", className)}
      >
        {children}
        <Link href={href} aria-label={title} aria-current={active ? "page" : undefined} className="absolute inset-0 z-10 rounded-md" />
      </motion.div>
    </ItemContext.Provider>
  );
}

export function DockLabel({ children, className }) {
  const { isHovered } = useDockItem();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const stop = isHovered.on("change", (v) => setVisible(v === 1));
    return () => stop();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ x: "-50%" }}
          aria-hidden="true"
          className={join("pointer-events-none absolute -top-6 left-1/2 w-fit whitespace-pre rounded border border-line bg-white px-2 py-0.5 text-xs text-ink", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DockIcon({ children, className }) {
  const { width } = useDockItem();
  const iconWidth = useTransform(width, (val) => val / 2);
  return <motion.div style={{ width: iconWidth }} className={join("flex items-center justify-center", className)}>{children}</motion.div>;
}
