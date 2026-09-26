import { SWAP_HINT } from "../lib/platform";
import { IArrowRight } from "./icons";

/** A two-line diff of the product's own promise: the empty state shows what the output will look like. */
function Specimen() {
  return (
    <div aria-hidden="true" className="diff mt-5 w-full max-w-[320px] overflow-hidden rounded-xl bg-card text-left shadow-[0_0_0_1px_var(--edge-rest),var(--shadow-card)]">
      <div className="code is-del animate-fade-up py-1 [animation-delay:120ms]" data-sign="-">
        compare text, <span className="mark">slowly</span>.
      </div>
      <div className="code is-add animate-fade-up py-1 [animation-delay:220ms]" data-sign="+">
        compare text, <span className="mark">instantly</span>.
      </div>
    </div>
  );
}

export function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <div className="grid h-full place-items-center overflow-auto p-6 text-center">
      <div className="flex max-w-sm animate-fade-up flex-col items-center">
        <p className="font-serif text-[34px] leading-[1.05] tracking-tight text-ink">
          Two texts in, <em className="text-accent-ink">every change</em> out.
        </p>
        <Specimen />
        <p className="mt-5 text-[13.5px] leading-relaxed text-muted">Paste, type or drop a file into both sides. It all happens in your browser.</p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onExample}
            className="group inline-flex h-9 items-center gap-2 rounded-full bg-ink pr-1.5 pl-4 text-[13px] font-medium text-bg shadow-float transition-transform duration-150 active:scale-[0.97]"
          >
            Try an example
            <span className="grid size-6 place-items-center rounded-full bg-bg/15 transition-transform duration-200 group-hover:translate-x-0.5">
              <IArrowRight className="size-3.5" />
            </span>
          </button>
          <span className="hidden text-[12px] text-faint sm:inline">
            <kbd className="rounded-md border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted">{SWAP_HINT}</kbd> swaps sides
          </span>
        </div>
      </div>
    </div>
  );
}

export function IdenticalState({ ignoring }: { ignoring: string | null }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="flex animate-fade-up flex-col items-center">
        <span aria-hidden="true" className="font-serif text-[64px] leading-[0.7] text-add-ink italic">
          =
        </span>
        <p className="mt-4 font-serif text-[34px] leading-none tracking-tight text-ink italic">No differences</p>
        <p className="mt-3 text-[13.5px] text-muted">Both sides are identical{ignoring ? `, ignoring ${ignoring}` : ""}.</p>
      </div>
    </div>
  );
}
