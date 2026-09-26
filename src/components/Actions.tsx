import { useState } from "react";
import { SWAP_HINT } from "../lib/platform";
import { type ThemeMode, useTheme } from "../lib/theme";
import { ICheck, ICopy, IEraser, IMonitor, IMoon, ISun, ISwap } from "./icons";
import { IconButton } from "./ui";

interface ActionsProps {
  readonly hasText: boolean;
  readonly hasChanges: boolean;
  readonly onSwap: () => void;
  readonly onClear: () => void;
  readonly onCopyPatch: () => Promise<boolean>;
}

const THEME_ICON: Record<ThemeMode, typeof ISun> = { system: IMonitor, light: ISun, dark: IMoon };
const THEME_LABEL: Record<ThemeMode, string> = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" };

/** Global actions; they sit in the carved space beside an editor tab instead of a header row. */
export function Actions({ hasText, hasChanges, onSwap, onClear, onCopyPatch }: ActionsProps) {
  const [mode, cycleTheme] = useTheme();
  const [copied, setCopied] = useState(false);
  const ThemeIcon = THEME_ICON[mode];

  const copy = async () => {
    const ok = await onCopyPatch();
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="ml-auto flex items-center gap-0.5 self-center">
      <IconButton label={`Swap sides (${SWAP_HINT})`} onClick={onSwap} disabled={!hasText}>
        <ISwap />
      </IconButton>
      <IconButton label="Clear both sides" onClick={onClear} disabled={!hasText}>
        <IEraser />
      </IconButton>
      <IconButton label={copied ? "Patch copied" : "Copy unified patch"} onClick={copy} disabled={!hasChanges}>
        {copied ? <ICheck className="text-add-ink" /> : <ICopy />}
      </IconButton>
      <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-line-strong" />
      <IconButton label={THEME_LABEL[mode]} onClick={cycleTheme} tipEnd>
        <ThemeIcon />
      </IconButton>
    </div>
  );
}
