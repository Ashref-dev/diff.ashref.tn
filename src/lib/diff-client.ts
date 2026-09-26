import { toLines } from "./lines";
import { type CompareOptions, type DiffPayload, lineTokens, type SyntaxPayload, type WorkerRequest, type WorkerResponse } from "./protocol";

export interface DiffInput {
  readonly original: string;
  readonly modified: string;
  readonly options: CompareOptions;
}

export interface DiffSnapshot {
  readonly id: number;
  readonly payload: DiffPayload;
  readonly oldLines: readonly string[];
  readonly newLines: readonly string[];
  readonly options: CompareOptions;
}

export interface SyntaxSnapshot {
  readonly id: number;
  readonly payload: SyntaxPayload;
  /** Stale-tolerant lookup used while a fresh highlight for the latest diff is still pending. */
  readonly byText: TokensByText;
}

export interface EngineState {
  readonly diff: DiffSnapshot | null;
  readonly syntax: SyntaxSnapshot | null;
}

type Side = "old" | "new";

/** Finds a line's tokens by its text. The maps are built lazily, only if a render ever needs them. */
export class TokensByText {
  private readonly maps: Partial<Record<Side, Map<string, Uint32Array>>> = {};

  constructor(
    private readonly lines: Readonly<Record<Side, readonly string[]>>,
    private readonly payload: SyntaxPayload,
  ) {}

  get(side: Side, text: string): Uint32Array | undefined {
    let map = this.maps[side];
    if (!map) {
      const built = new Map<string, Uint32Array>();
      this.lines[side].forEach((line, i) => {
        const tokens = lineTokens(this.payload[side], i);
        if (tokens && !built.has(line)) built.set(line, tokens);
      });
      map = built;
      this.maps[side] = built;
    }
    return map.get(text);
  }
}

/**
 * Owns the diff worker. At most one diff is in flight; inputs arriving meanwhile collapse into a single
 * pending request (latest wins), so the worker never builds a backlog while someone types or pastes.
 */
export class DiffClient {
  private readonly worker = new Worker(new URL("../diff.worker.ts", import.meta.url), { type: "module" });
  private readonly listeners = new Set<() => void>();
  private readonly sent = new Map<number, DiffInput>();
  private readonly patches = new Map<number, (patch: string | null) => void>();
  private seq = 0;
  private inFlight = false;
  private pending: DiffInput | null = null;
  state: EngineState = { diff: null, syntax: null };

  constructor() {
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.receive(event.data);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(input: DiffInput): void {
    this.pending = input;
    if (!this.inFlight) this.flush();
  }

  patch(original: string, modified: string): Promise<string | null> {
    const id = ++this.seq;
    return new Promise((resolve) => {
      this.patches.set(id, resolve);
      this.post({ type: "patch", id, original, modified });
    });
  }

  private post(request: WorkerRequest): void {
    this.worker.postMessage(request);
  }

  private flush(): void {
    const input = this.pending;
    if (!input) return;
    this.pending = null;
    this.inFlight = true;
    const id = ++this.seq;
    this.sent.set(id, input);
    this.post({ type: "diff", id, ...input });
  }

  private emit(state: EngineState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  private receive(message: WorkerResponse): void {
    switch (message.type) {
      case "diff": {
        this.inFlight = false;
        const input = this.sent.get(message.id);
        for (const id of this.sent.keys()) if (id < message.id) this.sent.delete(id);
        this.flush();
        if (!input) return;
        const diff: DiffSnapshot = {
          id: message.id,
          payload: message.payload,
          oldLines: toLines(input.original),
          newLines: toLines(input.modified),
          options: input.options,
        };
        const lang = message.payload.lang;
        const sameLang = lang !== "plain" && this.state.diff?.payload.lang === lang;
        const syntax = sameLang ? this.state.syntax : null;
        this.emit({ diff, syntax });
        break;
      }
      case "syntax": {
        const diff = this.state.diff;
        if (!diff || diff.id !== message.id || diff.payload.lang === "plain") return;
        const byText = new TokensByText({ old: diff.oldLines, new: diff.newLines }, message.payload);
        this.emit({ diff, syntax: { id: message.id, payload: message.payload, byText } });
        break;
      }
      case "patch": {
        this.patches.get(message.id)?.(message.patch);
        this.patches.delete(message.id);
        break;
      }
    }
  }
}
