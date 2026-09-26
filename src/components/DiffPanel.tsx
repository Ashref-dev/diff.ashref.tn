import type { ReactNode } from "react";
import type { EngineState } from "../lib/diff-client";
import { type Options, setOptions, type ViewMode } from "../lib/options";
import { DiffList } from "./DiffList";
import { EmptyState, IdenticalState } from "./EmptyState";
import { IChevronDown, IChevronUp, IColumns, IFold, IRows, IUnfold } from "./icons";
import { OptionsPopover } from "./OptionsPopover";
import { Surface } from "./Surface";
import { IconButton, Segmented } from "./ui";

interface DiffPanelProps {
  readonly engine: EngineState;
  readonly options: Options;
  /** Narrow screens always use the unified view; split columns would be unreadable. */
  readonly narrow: boolean;
  readonly inputsHidden: boolean;
  /** Resize handle for the carved space between the tabs (null while the inputs are hidden). */
  readonly splitter: ReactNode;
  readonly onToggleInputs: () => void;
  readonly onExample: () => void;
}

function Stats({ added, removed }: { added: number; removed: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5 text-[11.5px] font-medium tabular-nums">
      <span className="text-add-ink">+{added.toLocaleString()}</span>
      <span className="text-del-ink">−{removed.toLocaleString()}</span>
    </span>
  );
}

function announce(engine: EngineState): string {
  const payload = engine.diff?.payload;
  if (!payload || payload.status === "empty") return "";
  if (payload.status === "identical") return "No differences";
  const { added, removed } = payload.stats;
  return `${added} ${added === 1 ? "line" : "lines"} added, ${removed} removed`;
}

function paletteCss(palette: readonly (readonly [string, string])[]): string {
  return palette.map(([light, dark], i) => `.s${i}{color:${light}}[data-theme="dark"] .s${i}{color:${dark}}`).join("");
}

function ignoredLabel(options: Pick<Options, "ignoreWhitespace" | "ignoreCase">): string | null {
  if (options.ignoreWhitespace && options.ignoreCase) return "whitespace and case";
  if (options.ignoreWhitespace) return "whitespace";
  return options.ignoreCase ? "case" : null;
}

export function DiffPanel({ engine, options, narrow, inputsHidden, splitter, onToggleInputs, onExample }: DiffPanelProps) {
  const { diff, syntax } = engine;
  const status = diff?.payload.status ?? "empty";
  const view: ViewMode = narrow ? "unified" : options.view;

  const controls = (
    <div className="flex items-center gap-0.5">
      {narrow ? null : (
        <Segmented
          label="View"
          value={options.view}
          onChange={(next) => setOptions({ view: next })}
          compact
          small
          options={[
            { value: "unified", label: "Unified", icon: <IRows className="size-3" /> },
            { value: "split", label: "Split", icon: <IColumns className="size-3" /> },
          ]}
        />
      )}
      <IconButton label={options.fullFile ? "Collapse unchanged lines" : "Show full file"} aria-pressed={options.fullFile} onClick={() => setOptions({ fullFile: !options.fullFile })}>
        {options.fullFile ? <IFold /> : <IUnfold />}
      </IconButton>
      <OptionsPopover options={options} detected={diff?.payload.lang ?? null} />
      <IconButton label={inputsHidden ? "Show inputs" : "Hide inputs"} onClick={onToggleInputs} tipEnd>
        {inputsHidden ? <IChevronDown /> : <IChevronUp />}
      </IconButton>
    </div>
  );

  return (
    <Surface
      label="Differences"
      className="flex-1"
      between={splitter}
      end={controls}
      start={
        <>
          <span aria-hidden="true" className="font-mono text-[13px] font-semibold text-muted">
            ±
          </span>
          <h2 className="text-[12.5px] font-semibold text-ink">Diff</h2>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {announce(engine)}
          </p>
          {diff && status === "changed" ? <Stats added={diff.payload.stats.added} removed={diff.payload.stats.removed} /> : null}
          {status === "identical" ? <span className="text-[11.5px] text-faint">identical</span> : null}
          {status === "empty" ? <span className="text-[11.5px] text-faint">empty</span> : null}
        </>
      }
    >
      {syntax ? <style>{paletteCss(syntax.payload.palette)}</style> : null}
      {!diff || status === "empty" ? <EmptyState onExample={onExample} /> : null}
      {diff && status === "identical" ? <IdenticalState ignoring={ignoredLabel(diff.options)} /> : null}
      {diff && status === "changed" ? <DiffList source={{ diff, syntax }} view={view} wrap={options.wrap} fullFile={options.fullFile} /> : null}
    </Surface>
  );
}
