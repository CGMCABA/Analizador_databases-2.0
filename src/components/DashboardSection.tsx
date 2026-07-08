import { useCallback } from "react";
import { useAnimateOnEnter } from "@/hooks/useAnimateOnEnter";

interface DashboardSectionProps {
  id: string;
  numero: string;
  label: string;
  pregunta: string;
  sectionRef: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

export function DashboardSection({
  id,
  numero,
  label,
  pregunta,
  sectionRef,
  children,
}: DashboardSectionProps) {
  const { ref: enterRef, entered } = useAnimateOnEnter(0.08);

  // Merge the enter-observer ref with the nav-scroll ref
  const mergedRef = useCallback(
    (el: HTMLElement | null) => {
      enterRef.current = el;
      sectionRef(el);
    },
    [sectionRef, enterRef]
  );

  // Shared easing for all transitions in this section
  const ease = "cubic-bezier(0, 0, 0.2, 1)";

  return (
    <section
      id={id}
      ref={mergedRef}
      className="min-h-[100svh] py-10 scroll-mt-20 border-b border-slate-200 dark:border-[#1f2535] last:border-b-0"
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "none" : "translateY(24px)",
        transition: `opacity 380ms ${ease}, transform 380ms ${ease}`,
      }}
    >
      {/* Chapter header — staggered children */}
      <div className="mb-7 presentation-hide print:hidden">
        <p
          className="font-mono text-[9px] tracking-[.2em] uppercase text-slate-400 dark:text-slate-600 mb-1 select-none"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateX(-8px)",
            transition: `opacity 300ms 60ms ${ease}, transform 300ms 60ms ${ease}`,
          }}
        >
          {numero} / {label.toLowerCase()}
        </p>
        <p
          className="text-xs italic text-[#d4b96a]"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateX(-8px)",
            transition: `opacity 300ms 120ms ${ease}, transform 300ms 120ms ${ease}`,
          }}
        >
          {pregunta}
        </p>
        <div
          className="mt-2.5 h-px bg-gradient-to-r from-[#c8a84b]/35 to-transparent"
          style={{
            transform: entered ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: `transform 340ms 200ms ${ease}`,
          }}
        />
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}
