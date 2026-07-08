import { useRef, useState, useEffect } from "react";

// Detect once at module load — avoids per-hook calls to matchMedia
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fires once when the element enters the viewport.
 * If prefers-reduced-motion is set, starts as entered immediately.
 */
export function useAnimateOnEnter<T extends HTMLElement = HTMLElement>(threshold = 0.1) {
  const ref = useRef<T | null>(null);
  const [entered, setEntered] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el as HTMLElement);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, entered };
}
