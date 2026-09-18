"use client";

import { motion } from "framer-motion";

/** A short handwritten aside that "writes itself in" and then underlines. */
export function Handwriting({ children, className = "" }: { children: string; className?: string }) {
  return <motion.span
    className={className}
    initial={{ clipPath: "inset(0 100% 0 0)" }}
    animate={{ clipPath: "inset(0 0% 0 0)" }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
    <svg viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d="M2 5.8 C29 2.2, 72 7.4, 118 3.6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.65, delay: 0.5, ease: "easeOut" }}
      />
    </svg>
  </motion.span>;
}
