import { useRef, useState, useLayoutEffect, useCallback } from "react";

/**
 * Hook para navegación lateral por secciones.
 * Observa qué sección está visible y expone scrollTo para navegar programáticamente.
 * Usa useLayoutEffect sin deps para reconectar el observer tras cada render,
 * garantizando que los refs siempre estén poblados cuando se registran.
 */
export function useSectionNav() {
  const refsArray = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => refsArray.current.findIndex((r) => r === e.target))
          .filter((i) => i !== -1)
          .sort((a, b) => a - b);
        if (visible.length > 0) setActiveIndex(visible[0]);
      },
      // Activa cuando el heading de la sección cruza el tercio superior del viewport
      { rootMargin: "-15% 0px -65% 0px", threshold: 0 }
    );

    const els = refsArray.current.filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  const setRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      refsArray.current[index] = el;
    },
    []
  );

  const scrollTo = useCallback((index: number) => {
    refsArray.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return { activeIndex, scrollTo, setRef };
}
