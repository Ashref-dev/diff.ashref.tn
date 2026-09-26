import { createTwoFilesPatch } from "diff";
import { detectLang } from "./lib/detect";
import { computeDiff } from "./lib/engine";
import type { DiffPayload, DiffStatus, Lang, ResolvedLang, WorkerRequest, WorkerResponse } from "./lib/protocol";

type DiffRequest = Extract<WorkerRequest, { type: "diff" }>;

/** Syntax highlighting waits for a short typing pause; diffs never wait. */
const HIGHLIGHT_DELAY_MS = 80;
const PATCH_TIMEOUT_MS = 5000;

let latestDiff = 0;
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

function send(message: WorkerResponse, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

function buffers(payload: DiffPayload): Transferable[] {
  const { split, unified } = payload;
  return [split.kinds.buffer, split.old.buffer, split.new.buffer, unified.kinds.buffer, unified.old.buffer, unified.new.buffer];
}

function resolveLang(lang: Lang, original: string, modified: string): ResolvedLang {
  return lang === "auto" ? detectLang(original, modified) : lang;
}

function scheduleHighlight(request: DiffRequest, status: DiffStatus, lang: ResolvedLang): void {
  clearTimeout(highlightTimer);
  const { id, original, modified } = request;
  if (lang === "plain") return;
  highlightTimer = setTimeout(async () => {
    try {
      const highlighter = await import("./lib/highlight");
      // Nothing to color yet: compile the grammar now so the first real highlight is instant.
      if (status === "empty") {
        await highlighter.warmUp(lang);
        return;
      }
      const payload = await highlighter.highlightPair(original, modified, lang, () => latestDiff === id);
      if (payload) send({ type: "syntax", id, payload }, [payload.old, payload.new].flatMap((p) => (p ? [p.data.buffer, p.offsets.buffer] : [])));
    } catch (error) {
      // Highlighting is cosmetic: the diff stays usable in plain text.
      console.error("syntax highlighting failed", error);
    }
  }, HIGHLIGHT_DELAY_MS);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  switch (request.type) {
    case "diff": {
      latestDiff = request.id;
      const lang = resolveLang(request.options.lang, request.original, request.modified);
      const payload: DiffPayload = { ...computeDiff(request.original, request.modified, request.options), lang };
      send({ type: "diff", id: request.id, payload }, buffers(payload));
      scheduleHighlight(request, payload.status, lang);
      break;
    }
    case "patch": {
      const patch = createTwoFilesPatch("original", "modified", request.original, request.modified, undefined, undefined, { timeout: PATCH_TIMEOUT_MS });
      send({ type: "patch", id: request.id, patch: patch ?? null });
      break;
    }
  }
};
