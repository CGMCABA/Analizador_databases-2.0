interface Chapter {
  id: string;
  numero: string;
  label: string;
}

interface SectionNavProps {
  chapters: Chapter[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export function SectionNav({ chapters, activeIndex, onNavigate }: SectionNavProps) {
  if (chapters.length === 0) return null;

  return (
    <nav
      className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3.5 print:hidden presentation-hide"
      aria-label="Navegación de secciones"
    >
      {chapters.map((ch, i) => (
        <button
          key={ch.id}
          onClick={() => onNavigate(i)}
          aria-label={`Ir a ${ch.label}`}
          title={`${ch.numero} · ${ch.label}`}
          className="group relative flex items-center"
        >
          <span
            className={[
              "block rounded-full transition-all duration-200",
              i === activeIndex
                ? "w-2.5 h-2.5 bg-[#c8a84b] shadow-[0_0_6px_rgba(200,168,75,0.5)]"
                : "w-2 h-2 bg-slate-600 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-400",
            ].join(" ")}
          />
          {/* Tooltip label */}
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[#131720] border border-[#2e3852] text-[10px] font-mono text-slate-300 px-2.5 py-1 rounded-md shadow-lg select-none">
            {ch.numero} · {ch.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
