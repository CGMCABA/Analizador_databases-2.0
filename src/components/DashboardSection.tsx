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
  return (
    <section
      id={id}
      ref={sectionRef}
      className="min-h-[100svh] py-10 scroll-mt-20 border-b border-slate-200 dark:border-[#1f2535] last:border-b-0"
    >
      {/* Chapter header */}
      <div className="mb-7 presentation-hide print:hidden">
        <p className="font-mono text-[9px] tracking-[.2em] uppercase text-slate-400 dark:text-slate-600 mb-1 select-none">
          {numero} / {label.toLowerCase()}
        </p>
        <p className="text-xs italic text-[#d4b96a]">{pregunta}</p>
        <div className="mt-2.5 h-px bg-gradient-to-r from-[#c8a84b]/35 to-transparent" />
      </div>

      <div className="space-y-5">
        {children}
      </div>
    </section>
  );
}
