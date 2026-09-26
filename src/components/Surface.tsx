import clsx from "clsx";
import { type DragEventHandler, type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";

interface SurfaceProps {
  readonly label: string;
  /** Tab rising from the top-left corner. */
  readonly start: ReactNode;
  /** Optional tab rising from the top-right corner. */
  readonly end?: ReactNode;
  /** Content of the carved space between the tabs (sits on the page, not on the sheet). */
  readonly between?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
  readonly onDragOver?: DragEventHandler<HTMLElement>;
  readonly onDragLeave?: DragEventHandler<HTMLElement>;
  readonly onDrop?: DragEventHandler<HTMLElement>;
}

/** Mirrors a tab's rendered width into `--tab-s` / `--tab-e` so the painted sheet follows it. */
function useTabWidth(surface: RefObject<HTMLElement | null>, tab: RefObject<HTMLElement | null>, key: "s" | "e") {
  useLayoutEffect(() => {
    const host = surface.current;
    const element = tab.current;
    if (!host || !element) return;
    const attribute = key === "s" ? "data-start" : "data-end";
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.ceil(entry?.borderBoxSize[0]?.inlineSize ?? element.offsetWidth);
      host.style.setProperty(`--tab-${key}`, `${width}px`);
      host.toggleAttribute(attribute, width > 0);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      host.removeAttribute(attribute);
    };
  }, [surface, tab, key]);
}

export function Surface({ label, start, end, between, className, children, ...drag }: SurfaceProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useTabWidth(surfaceRef, startRef, "s");
  useTabWidth(surfaceRef, endRef, "e");

  return (
    <section ref={surfaceRef} aria-label={label} className={clsx("surface min-h-0 min-w-0", className)} {...drag}>
      <div className="surface-shape" aria-hidden="true">
        <i className="shape-body" />
        <i className="shape-tab" data-at="start" />
        <i className="shape-fillet" data-at="start" />
        {end ? (
          <>
            <i className="shape-tab" data-at="end" />
            <i className="shape-fillet" data-at="end" />
          </>
        ) : null}
      </div>
      <div className="surface-tabs">
        <div ref={startRef} className="surface-tab">
          {start}
        </div>
        <div className="flex min-w-0 flex-1">{between}</div>
        {end ? (
          <div ref={endRef} className="surface-tab pr-1.5 pl-2">
            {end}
          </div>
        ) : null}
      </div>
      <div className="surface-body">{children}</div>
    </section>
  );
}
