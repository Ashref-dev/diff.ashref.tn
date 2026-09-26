import clsx from "clsx";
import { type DragEvent, type ReactNode, type Ref, useRef, useState } from "react";
import { countContentLines, countLines } from "../lib/lines";
import { Surface } from "./Surface";

/** Files above this size are almost certainly not text meant for a visual diff. */
const MAX_FILE_BYTES = 15 * 1024 * 1024;

interface EditorProps {
  readonly side: "original" | "modified";
  readonly label: string;
  readonly placeholder: string;
  readonly textareaRef: Ref<HTMLTextAreaElement>;
  readonly autoFocus?: boolean;
  /** Rendered in the carved space right of the tab, aligned to the far edge. */
  readonly aside?: ReactNode;
  readonly onInput: () => void;
  readonly onFile: (text: string) => void;
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files");
}

export function Editor({ side, label, placeholder, textareaRef, autoFocus, aside, onInput, onFile }: EditorProps) {
  const [lines, setLines] = useState(1);
  const [contentLines, setContentLines] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gutterRef = useRef<HTMLDivElement>(null);
  const id = `input-${side}`;
  const numbers = Array.from({ length: lines }, (_, i) => i + 1).join("\n");

  const drop = async (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file || file.size > MAX_FILE_BYTES) return;
    onFile(await file.text());
  };

  return (
    <Surface
      label={label}
      className="flex-1"
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setDragging(false);
      }}
      onDrop={drop}
      between={aside}
      start={
        <>
          <span aria-hidden="true" className={clsx("font-mono text-[13px] font-semibold", side === "original" ? "text-del-ink" : "text-add-ink")}>
            {side === "original" ? "−" : "+"}
          </span>
          <label htmlFor={id} className="text-[12.5px] font-semibold text-ink">
            {label}
          </label>
          <span className="min-w-[4.5em] text-[11.5px] text-faint tabular-nums">
            {contentLines > 0 ? `${contentLines.toLocaleString()} ${contentLines === 1 ? "line" : "lines"}` : "empty"}
          </span>
        </>
      }
    >
      <div className="relative flex h-full min-h-0">
        <div aria-hidden="true" className="w-[calc(var(--digits)*1ch+22px)] shrink-0 overflow-hidden bg-sunken/70" style={{ "--digits": Math.max(2, String(lines).length) }}>
          <div ref={gutterRef} className="editor-gutter pr-2.5 pl-2">
            {numbers}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          id={id}
          data-rim=""
          className="editor-text scroll-thin min-h-0 min-w-0 flex-1"
          placeholder={placeholder}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          onInput={(event) => {
            const text = event.currentTarget.value;
            setLines(countLines(text));
            setContentLines(countContentLines(text));
            onInput();
          }}
          onScroll={(event) => {
            const gutter = gutterRef.current;
            if (gutter) gutter.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`;
          }}
        />
        {dragging ? (
          <div className="pointer-events-none absolute inset-2 grid animate-fade place-items-center rounded-xl border-2 border-dashed border-accent bg-accent-soft text-[13px] font-medium text-accent-ink backdrop-blur-[2px]">
            Drop to load into {label}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
