import type { KeyboardEvent, PointerEvent, RefObject } from "react";

export const MIN_SPLIT = 0.14;
export const MAX_SPLIT = 0.8;
const STEP = 0.05;

const clamp = (value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));

interface SplitterProps {
  readonly split: number;
  /** The element whose `--split` custom property sizes the editors; updated directly while dragging. */
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly onCommit: (split: number) => void;
  readonly onCollapse: () => void;
}

/** Resize handle living in the diff surface's carved notch. Drag, arrow keys; double-click or Enter hides the inputs. */
export function Splitter({ split, containerRef, onCommit, onCollapse }: SplitterProps) {
  const fractionAt = (clientY: number): number | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect && rect.height > 0 ? clamp((clientY - rect.top) / rect.height) : null;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    let latest = split;
    const move = (e: globalThis.PointerEvent) => {
      const next = fractionAt(e.clientY);
      if (next === null) return;
      latest = next;
      containerRef.current?.style.setProperty("--split", String(next));
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      onCommit(latest);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        onCommit(clamp(split - STEP));
        break;
      case "ArrowDown":
        event.preventDefault();
        onCommit(clamp(split + STEP));
        break;
      case "Enter":
        event.preventDefault();
        onCollapse();
        break;
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize inputs. Enter hides them."
      aria-valuemin={Math.round(MIN_SPLIT * 100)}
      aria-valuemax={Math.round(MAX_SPLIT * 100)}
      aria-valuenow={Math.round(split * 100)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onCollapse}
      className="group grid min-w-12 flex-1 cursor-row-resize touch-none place-items-center rounded-t-xl focus-visible:outline-offset-[-4px]"
    >
      <span className="h-1 w-9 rounded-full bg-line-strong transition-[background-color,scale] duration-200 group-hover:scale-x-150 group-hover:bg-accent group-active:scale-x-175 group-active:bg-accent" />
    </div>
  );
}
