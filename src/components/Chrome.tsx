import clsx from "clsx";
import { SWAP_HINT } from "../lib/platform";
import { IChevronDown } from "./icons";

function Side({ label, lines, tone }: { label: string; lines: number; tone: "del" | "add" }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span aria-hidden="true" className={clsx("font-mono text-[13px] font-semibold", tone === "del" ? "text-del-ink" : "text-add-ink")}>
        {tone === "del" ? "−" : "+"}
      </span>
      <span className="font-semibold text-ink">{label}</span>
      <span className="text-faint tabular-nums">
        {lines.toLocaleString()} {lines === 1 ? "line" : "lines"}
      </span>
    </span>
  );
}

/** Stand-in for the editors while they are hidden; the whole bar brings them back. */
export function InputsSummary({ oldLines, newLines, onShow }: { oldLines: number; newLines: number; onShow: () => void }) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex h-10 min-w-0 flex-1 animate-fade items-center gap-3 rounded-2xl bg-card px-3.5 text-left text-[12.5px] shadow-[0_0_0_1px_var(--edge-rest),var(--shadow-card)] transition-shadow hover:shadow-[0_0_0_1px_var(--line-strong),var(--shadow-card)]"
    >
      <Side label="Original" lines={oldLines} tone="del" />
      <Side label="Modified" lines={newLines} tone="add" />
      <span className="flex shrink-0 items-center gap-1 text-muted">
        Edit <IChevronDown className="size-3.5" />
      </span>
    </button>
  );
}

export function StatusBar() {
  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 px-5 text-[11.5px] text-faint">
      <a href="/" className="font-medium text-muted transition-colors hover:text-ink">
        diff.achraf.tn
      </a>
      <span className="hidden sm:inline">Runs locally · nothing leaves your browser</span>
      <span className="hidden md:inline">
        <kbd className="font-mono">{SWAP_HINT}</kbd> swap · drop a file on either side
      </span>
      <a href="https://achraf.tn" className="ml-auto rounded-full transition-colors hover:text-ink" target="_blank" rel="noopener">
        Made by <span className="font-serif text-[13px] italic">achraf.tn</span>
      </a>
    </footer>
  );
}
