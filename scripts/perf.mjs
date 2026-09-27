// Low-end laptop performance gate.
// Drives the production build (`bun run preview:perf`) in Chromium with the CPU throttled 6x, once with GPU
// compositing and once with software compositing (a stand-in for weak or blocklisted integrated GPUs),
// and fails when typing latency or frame times exceed the budgets below.
//
//   bun run build && bun run preview:perf   # in another terminal
//   bun run perf                            # CHROME_PATH=/path/to/chrome to pick a browser
import { chromium } from "playwright-core";

const URL = process.env.PERF_URL ?? "http://127.0.0.1:4174/";
const CPU_RATE = 6;
const BUDGET = { inp: 100, frame: 50 };
const BIG_DOC_LINES = 3000;

const MIN_FRAMES = 10;

function assertWorkload(ok, what) {
  if (!ok) throw new Error(`Workload not observed: ${what}`);
}

const pct = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]);
};

function instrument() {
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.interactionId) window.__events.push({ id: e.interactionId, t: e.startTime, d: e.duration });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
  window.__startFrames = () => {
    const frames = [];
    window.__frames = frames;
    const loop = (ts) => {
      if (window.__frames !== frames) return;
      frames.push(ts);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  window.__stopFrames = () => {
    const frames = window.__frames ?? [];
    window.__frames = null;
    return frames.slice(1).map((t, i) => t - frames[i]);
  };
}

async function typeInto(page, text) {
  const input = page.locator("#input-modified");
  await input.click();
  await page.keyboard.press("ControlOrMeta+End");
  const before = (await input.inputValue()).length;
  const since = await page.evaluate(() => performance.now());
  await page.keyboard.type(text, { delay: 70 });
  await page.waitForTimeout(600);
  assertWorkload((await input.inputValue()).length === before + text.length, "typed text did not land in the textarea");
  const worst = await page.evaluate((since) => {
    const byInteraction = new Map();
    for (const e of window.__events) if (e.t >= since) byInteraction.set(e.id, Math.max(byInteraction.get(e.id) ?? 0, e.d));
    return [...byInteraction.values()];
  }, since);
  // Interactions faster than 16ms are not reported by the Event Timing API; count them as 16ms.
  const keys = text.length;
  const samples = [...worst, ...Array(Math.max(0, keys - worst.length)).fill(16)];
  return { metric: "inp", p95: pct(samples, 0.95) };
}

async function recordFrames(page, action) {
  await page.evaluate(() => window.__startFrames());
  await action();
  await page.waitForTimeout(400);
  const deltas = await page.evaluate(() => window.__stopFrames());
  assertWorkload(deltas.length >= MIN_FRAMES, `only ${deltas.length} frames recorded`);
  return { metric: "frame", p95: pct(deltas, 0.95) };
}

async function dragSplitter(page) {
  return recordFrames(page, async () => {
    const box = await page.locator('[role="separator"]').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const rowHeight = () => page.locator("#input-original").evaluate((el) => el.closest("div.mb-3").getBoundingClientRect().height);
    const start = await rowHeight();
    let peak = start;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 45; i++) {
      await page.mouse.move(x, y + (i <= 30 ? i : 60 - i) * 8);
      await page.waitForTimeout(16);
      if (i === 30) peak = await rowHeight();
    }
    await page.mouse.up();
    assertWorkload(peak - start > 100, "the splitter drag did not resize the editors");
  });
}

async function scrollDiff(page) {
  const box = await page.locator('section[aria-label="Differences"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const scrollTop = () => page.locator('section[aria-label="Differences"] .surface-body [data-rim]').first().evaluate((el) => el.scrollTop);
  const start = await scrollTop();
  const result = await recordFrames(page, async () => {
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(16);
    }
  });
  assertWorkload((await scrollTop()) > start, "the diff did not scroll");
  return result;
}

async function loadBigDocs(page) {
  await page.evaluate((lines) => {
    const doc = Array.from({ length: lines }, (_, i) => `  const value_${i} = compute(${i}, "payload", options.flag_${i % 7});`).join("\n");
    const set = (id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("input-original", doc);
    set("input-modified", doc.replace(/value_1(\d)00 /g, "renamed_1$100 "));
  }, BIG_DOC_LINES);
  await page.waitForTimeout(3000);
}

async function run(gpu) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: gpu ? [] : ["--disable-gpu", "--disable-gpu-compositing"],
  });
  const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.addInitScript(instrument);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });

  await page.goto(URL, { waitUntil: "load" });
  await page.getByText("Try an example").first().click();
  await page.waitForTimeout(2500);

  const results = {
    typing: await typeInto(page, "const typed = compute(value, other);"),
    drag: await dragSplitter(page),
    scroll: await scrollDiff(page),
  };
  await loadBigDocs(page);
  results["typing (3k lines)"] = await typeInto(page, " typed;");
  results["drag (3k lines)"] = await dragSplitter(page);

  await browser.close();
  return { results, errors };
}

let failed = false;
for (const gpu of [true, false]) {
  const mode = gpu ? "GPU compositing" : "software compositing";
  const { results, errors } = await run(gpu);
  console.log(`\n${mode} · CPU ${CPU_RATE}x slower`);
  for (const [name, { metric, p95 }] of Object.entries(results)) {
    const budget = BUDGET[metric];
    const ok = p95 <= budget;
    failed ||= !ok;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(18)} ${metric === "inp" ? "input→paint" : "frame time "} p95 ${String(p95).padStart(4)}ms  (budget ${budget}ms)`);
  }
  if (errors.length > 0) {
    failed = true;
    console.log(`  FAIL  console errors: ${errors.join(" | ")}`);
  }
}
console.log(failed ? "\nPerformance budget exceeded." : "\nAll performance budgets met.");
process.exit(failed ? 1 : 0);
