import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { Actions } from "./components/Actions";
import { DiffPanel } from "./components/DiffPanel";
import { Editor } from "./components/Editor";
import { InputsSummary, StatusBar } from "./components/Chrome";
import { MAX_SPLIT, MIN_SPLIT, Splitter } from "./components/Splitter";
import { DiffClient, type EngineState } from "./lib/diff-client";
import { EXAMPLE_MODIFIED, EXAMPLE_ORIGINAL } from "./lib/example";
import { useMediaQuery } from "./lib/media";
import { useOptions } from "./lib/options";

const SPLIT_KEY = "diff:split";
const DEFAULT_SPLIT = 0.42;

let sharedClient: DiffClient | null = null;
const getClient = (): DiffClient => (sharedClient ??= new DiffClient());

function readSplit(): number {
  try {
    const value = Number(localStorage.getItem(SPLIT_KEY));
    return value >= MIN_SPLIT && value <= MAX_SPLIT ? value : DEFAULT_SPLIT;
  } catch {
    return DEFAULT_SPLIT;
  }
}

/** Diff results land in a transition so a keystroke is never blocked behind re-rendering the output. */
function useEngine(client: DiffClient): EngineState {
  const [state, setState] = useState(client.state);
  useEffect(() => client.subscribe(() => startTransition(() => setState(client.state))), [client]);
  return state;
}

function setText(target: HTMLTextAreaElement | null, text: string): void {
  if (!target) return;
  target.value = text;
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

export function App() {
  const client = getClient();
  const engine = useEngine(client);
  const options = useOptions();
  const narrow = useMediaQuery("(max-width: 767px)");
  const originalRef = useRef<HTMLTextAreaElement>(null);
  const modifiedRef = useRef<HTMLTextAreaElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(readSplit);
  const [inputsHidden, setInputsHidden] = useState(false);
  const { precision, ignoreWhitespace, ignoreCase, lang } = options;
  const status = engine.diff?.payload.status ?? "empty";

  const run = () =>
    client.update({
      original: originalRef.current?.value ?? "",
      modified: modifiedRef.current?.value ?? "",
      options: { precision, ignoreWhitespace, ignoreCase, lang },
    });
  const rerun = useEffectEvent(run);
  useEffect(() => rerun(), [precision, ignoreWhitespace, ignoreCase, lang]);

  const swap = () => {
    const original = originalRef.current?.value ?? "";
    setText(originalRef.current, modifiedRef.current?.value ?? "");
    setText(modifiedRef.current, original);
  };
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    swap();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const clear = () => {
    setText(originalRef.current, "");
    setText(modifiedRef.current, "");
    originalRef.current?.focus();
  };

  const loadExample = () => {
    setInputsHidden(false);
    setText(originalRef.current, EXAMPLE_ORIGINAL);
    setText(modifiedRef.current, EXAMPLE_MODIFIED);
  };

  const copyPatch = async (): Promise<boolean> => {
    const patch = await client.patch(originalRef.current?.value ?? "", modifiedRef.current?.value ?? "");
    if (patch === null) return false;
    try {
      await navigator.clipboard.writeText(patch);
      return true;
    } catch {
      return false;
    }
  };

  const commitSplit = (next: number) => {
    setSplit(next);
    try {
      localStorage.setItem(SPLIT_KEY, String(next));
    } catch {
      // Not persisted; the size still applies for this visit.
    }
  };

  const actions = <Actions hasText={status !== "empty"} hasChanges={status === "changed"} onSwap={swap} onClear={clear} onCopyPatch={copyPatch} />;

  return (
    <div className="flex h-dvh flex-col">
      <h1 className="sr-only">diff.achraf.tn — compare text instantly</h1>
      <main ref={mainRef} className="flex min-h-0 flex-1 flex-col px-2.5 pt-2.5 sm:px-4 sm:pt-4">
        {inputsHidden ? (
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <InputsSummary oldLines={engine.diff?.oldLines.length ?? 0} newLines={engine.diff?.newLines.length ?? 0} onShow={() => setInputsHidden(false)} />
            {actions}
          </div>
        ) : null}
        <div
          ref={rowRef}
          hidden={inputsHidden}
          className="mb-3 flex min-h-0 shrink-0 gap-3 max-md:flex-col md:gap-4"
          style={{ height: `${split * 100}%` }}
        >
          <Editor
            side="original"
            label="Original"
            placeholder="Paste or type the original text, or drop a file"
            textareaRef={originalRef}
            autoFocus
            aside={narrow ? actions : null}
            onInput={run}
            onFile={(text) => setText(originalRef.current, text)}
          />
          <Editor
            side="modified"
            label="Modified"
            placeholder="Paste or type the changed text, or drop a file"
            textareaRef={modifiedRef}
            aside={narrow ? null : actions}
            onInput={run}
            onFile={(text) => setText(modifiedRef.current, text)}
          />
        </div>
        <DiffPanel
          engine={engine}
          options={options}
          narrow={narrow}
          inputsHidden={inputsHidden}
          splitter={inputsHidden ? null : <Splitter split={split} containerRef={mainRef} targetRef={rowRef} onCommit={commitSplit} onCollapse={() => setInputsHidden(true)} />}
          onToggleInputs={() => setInputsHidden((hidden) => !hidden)}
          onExample={loadExample}
        />
      </main>
      <StatusBar />
    </div>
  );
}
