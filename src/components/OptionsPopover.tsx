import { useEffect, useRef, useState } from "react";
import { LANG_LABELS } from "../lib/languages";
import { isLang, type Options, setOptions } from "../lib/options";
import { CODE_LANGS, type ResolvedLang } from "../lib/protocol";
import { ISliders } from "./icons";
import { IconButton, Segmented, Switch } from "./ui";

const POPOVER_ID = "diff-options";

function autoLabel(detected: ResolvedLang | null): string {
  if (detected === null) return "Auto";
  return `Auto · ${detected === "plain" ? "Plain text" : LANG_LABELS[detected]}`;
}

export function OptionsPopover({ options, detected }: { options: Options; detected: ResolvedLang | null }) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const altersResult = options.ignoreWhitespace || options.ignoreCase;

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const onToggle = (event: ToggleEvent) => {
      const isOpen = event.newState === "open";
      setOpen(isOpen);
      const anchor = buttonRef.current?.getBoundingClientRect();
      if (!isOpen || !anchor) return;
      popover.style.top = `${anchor.bottom + 8}px`;
      popover.style.right = `${Math.max(8, window.innerWidth - anchor.right)}px`;
    };
    popover.addEventListener("beforetoggle", onToggle);
    return () => popover.removeEventListener("beforetoggle", onToggle);
  }, []);

  return (
    <>
      <IconButton ref={buttonRef} label="Diff options" tipEnd popoverTarget={POPOVER_ID} aria-expanded={open}>
        <ISliders />
        {altersResult ? <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" /> : null}
      </IconButton>
      <div
        ref={popoverRef}
        id={POPOVER_ID}
        popover="auto"
        aria-label="Diff options"
        className="fixed inset-auto m-0 w-[284px] animate-pop rounded-2xl border border-line bg-card p-2 text-ink shadow-float"
      >
        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2">
          <span className="text-[12.5px] font-medium text-muted">Highlight changes by</span>
          <Segmented
            label="Intra-line precision"
            value={options.precision}
            onChange={(precision) => setOptions({ precision })}
            options={[
              { value: "word", label: "Word" },
              { value: "char", label: "Char" },
            ]}
          />
        </div>
        <div className="my-1 h-px bg-line" />
        <Switch label="Ignore whitespace" hint="Indentation and spacing" checked={options.ignoreWhitespace} onChange={(ignoreWhitespace) => setOptions({ ignoreWhitespace })} />
        <Switch label="Ignore case" checked={options.ignoreCase} onChange={(ignoreCase) => setOptions({ ignoreCase })} />
        <Switch label="Wrap lines" checked={options.wrap} onChange={(wrap) => setOptions({ wrap })} />
        <div className="my-1 h-px bg-line" />
        <label className="flex items-center justify-between gap-3 px-2.5 py-2">
          <span className="text-[13px] font-medium">Syntax</span>
          <select
            value={options.lang}
            onChange={(event) => {
              const lang = event.currentTarget.value;
              if (isLang(lang)) setOptions({ lang });
            }}
            className="h-8 min-w-0 flex-1 cursor-pointer rounded-full border border-line bg-sunken px-3 text-[12.5px] text-ink"
          >
            <option value="auto">{autoLabel(options.lang === "auto" ? detected : null)}</option>
            <option value="plain">Plain text</option>
            {CODE_LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {LANG_LABELS[lang]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
