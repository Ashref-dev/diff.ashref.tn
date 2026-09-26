import clsx from "clsx";
import type { DiffSnapshot, SyntaxSnapshot } from "../lib/diff-client";
import { lineTokens, RowKind } from "../lib/protocol";
import { segmentize } from "../lib/segments";

type Side = "old" | "new";
type Tone = "add" | "del" | "ctx";

const TONE_CLASS: Record<Tone, string | undefined> = { add: "is-add", del: "is-del", ctx: undefined };
const SIGN: Record<Tone, string> = { add: "+", del: "-", ctx: "" };

export interface RowSource {
  readonly diff: DiffSnapshot;
  readonly syntax: SyntaxSnapshot | null;
}

function tokensFor({ diff, syntax }: RowSource, side: Side, index: number, text: string): Uint32Array | undefined {
  if (!syntax) return undefined;
  if (syntax.id === diff.id) return lineTokens(syntax.payload[side], index);
  return syntax.byText.get(side, text);
}

function Code({ source, side, index, tone }: { source: RowSource; side: Side; index: number; tone: Tone }) {
  const text = (side === "old" ? source.diff.oldLines : source.diff.newLines)[index] ?? "";
  const marks = tone === "ctx" ? undefined : source.diff.payload.marks[side].get(index);
  const segments = segmentize(text, tokensFor(source, side, index, text), marks);
  return (
    <div className={clsx("code", TONE_CLASS[tone])} data-sign={SIGN[tone]}>
      {segments.map((segment, i) =>
        segment.color < 0 && !segment.marked ? (
          segment.text
        ) : (
          <span key={i} className={clsx(segment.color >= 0 && `s${segment.color}`, segment.marked && "mark")}>
            {segment.text}
          </span>
        ),
      )}
    </div>
  );
}

function LineNo({ index, tone }: { index: number; tone: Tone }) {
  return <div className={clsx("ln", TONE_CLASS[tone])}>{index >= 0 ? index + 1 : null}</div>;
}

const Void = () => (
  <>
    <div className="ln is-void" />
    <div className="code is-void" />
  </>
);

export function SplitRow({ source, kind, oldIndex, newIndex }: { source: RowSource; kind: RowKind; oldIndex: number; newIndex: number }) {
  const oldTone: Tone = kind === RowKind.Context ? "ctx" : "del";
  const newTone: Tone = kind === RowKind.Context ? "ctx" : "add";
  return (
    <>
      {oldIndex >= 0 ? (
        <>
          <LineNo index={oldIndex} tone={oldTone} />
          <Code source={source} side="old" index={oldIndex} tone={oldTone} />
        </>
      ) : (
        <Void />
      )}
      {newIndex >= 0 ? (
        <>
          <LineNo index={newIndex} tone={newTone} />
          <Code source={source} side="new" index={newIndex} tone={newTone} />
        </>
      ) : (
        <Void />
      )}
    </>
  );
}

export function UnifiedRow({ source, kind, oldIndex, newIndex }: { source: RowSource; kind: RowKind; oldIndex: number; newIndex: number }) {
  const tone: Tone = kind === RowKind.Removed ? "del" : kind === RowKind.Added ? "add" : "ctx";
  const side: Side = kind === RowKind.Removed ? "old" : "new";
  return (
    <>
      <LineNo index={oldIndex} tone={tone} />
      <LineNo index={newIndex} tone={tone} />
      <Code source={source} side={side} index={side === "old" ? oldIndex : newIndex} tone={tone} />
    </>
  );
}
