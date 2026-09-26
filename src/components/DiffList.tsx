import { useVirtualizer } from "@tanstack/react-virtual";
import { type CSSProperties, useRef, useState } from "react";
import { collapse, type Layout } from "../lib/collapse";
import type { ViewMode } from "../lib/options";
import { RowKind, type RowTable } from "../lib/protocol";
import { type RowSource, SplitRow, UnifiedRow } from "./DiffRows";
import { IExpandLines } from "./icons";

const LINE_HEIGHT = 20;
const GAP_HEIGHT = 34;

interface DiffListProps {
  readonly source: RowSource;
  readonly view: ViewMode;
  readonly wrap: boolean;
  readonly fullFile: boolean;
}

/** Owns expand state and the (memoized) visible layout; scrolling never recomputes it. */
export function DiffList({ source, view, wrap, fullFile }: DiffListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const table = view === "split" ? source.diff.payload.split : source.diff.payload.unified;
  const layout = collapse(table, expanded, fullFile);
  const expand = (key: number) => setExpanded((prev) => new Set(prev).add(key));
  const { oldLines, newLines, payload } = source.diff;
  const digits = String(Math.max(oldLines.length, newLines.length, 10)).length;
  const oldWidth = wrap ? 0 : payload.width.old;
  const newWidth = wrap ? 0 : view === "split" ? payload.width.new : Math.max(payload.width.old, payload.width.new);

  return (
    <VirtualRows
      key={`${view}:${wrap}`}
      source={source}
      table={table}
      layout={layout}
      view={view}
      wrap={wrap}
      onExpand={expand}
      style={{
        "--gutter": `calc(${digits}ch + 18px)`,
        "--old-w": `calc(${oldWidth}ch + 40px)`,
        "--new-w": `calc(${newWidth}ch + 40px)`,
        "--content-w": wrap ? "100%" : `calc(var(--gutter) * 2 + var(--new-w)${view === "split" ? " + var(--old-w)" : ""})`,
      }}
    />
  );
}

interface VirtualRowsProps {
  readonly source: RowSource;
  readonly table: RowTable;
  readonly layout: Layout;
  readonly view: ViewMode;
  readonly wrap: boolean;
  readonly onExpand: (key: number) => void;
  readonly style: CSSProperties;
}

function VirtualRows({ source, table, layout, view, wrap, onExpand, style }: VirtualRowsProps) {
  // TanStack Virtual mutates one instance across renders; compiler memoization would freeze its output.
  "use no memo";
  const scrollRef = useRef<HTMLDivElement>(null);
  const { items, gaps } = layout;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => ((items[i] ?? 0) < 0 ? GAP_HEIGHT : LINE_HEIGHT),
    getItemKey: (i) => items[i] ?? i,
    overscan: 16,
  });
  const Row = view === "split" ? SplitRow : UnifiedRow;

  return (
    <div ref={scrollRef} className="diff scroll-thin h-full overflow-auto overscroll-contain" data-rim="" data-wrap={wrap} style={style} tabIndex={0} aria-label="Diff output">
      <div className="relative min-w-full" style={{ height: virtualizer.getTotalSize(), width: "max(100%, var(--content-w))" }}>
        {virtualizer.getVirtualItems().map((virtual) => {
          const item = items[virtual.index] ?? 0;
          const gap = item < 0 ? gaps[-item - 1] : undefined;
          return (
            <div
              key={virtual.key}
              data-index={virtual.index}
              ref={wrap ? virtualizer.measureElement : undefined}
              className={gap ? undefined : "diff-row"}
              data-view={view}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtual.start}px)`, height: wrap && !gap ? undefined : virtual.size }}
            >
              {gap ? (
                <button type="button" className="gap" onClick={() => onExpand(gap.key)}>
                  <span className="gap-label">
                    <IExpandLines className="size-3.5" />
                    {(gap.to - gap.from).toLocaleString()} unchanged {gap.to - gap.from === 1 ? "line" : "lines"}
                    <span className="font-mono text-[11.5px] font-normal text-faint">
                      {(table.old[gap.from] ?? 0) + 1}–{(table.old[gap.to - 1] ?? 0) + 1}
                    </span>
                  </span>
                </button>
              ) : (
                <Row source={source} kind={kindAt(table, item)} oldIndex={table.old[item] ?? -1} newIndex={table.new[item] ?? -1} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function kindAt(table: RowTable, row: number): RowKind {
  switch (table.kinds[row]) {
    case RowKind.Removed:
      return RowKind.Removed;
    case RowKind.Added:
      return RowKind.Added;
    case RowKind.Modified:
      return RowKind.Modified;
    default:
      return RowKind.Context;
  }
}
