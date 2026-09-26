import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  readonly label: string;
  /** Anchor the tooltip to the right edge (for buttons near the viewport edge). */
  readonly tipEnd?: boolean;
}

export function IconButton({ label, tipEnd, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      data-tip-end={tipEnd ? "" : undefined}
      className={clsx(
        "inline-grid size-8 shrink-0 place-items-center rounded-full text-muted transition-[color,background-color,transform] duration-150",
        "hover:bg-line hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40",
        "aria-pressed:bg-accent-soft aria-pressed:text-accent-ink aria-expanded:bg-line aria-expanded:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly SegmentOption<T>[];
  readonly onChange: (value: T) => void;
  /** Hide text labels below the sm breakpoint when icons exist. */
  readonly compact?: boolean;
  readonly small?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, compact, small }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="group"
      aria-label={label}
      className="relative isolate grid auto-cols-fr grid-flow-col rounded-full bg-line p-0.5"
      style={{ "--n": options.length, "--i": index }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 -z-10 w-[calc((100%-4px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-full bg-raised shadow-card transition-transform duration-200 ease-[cubic-bezier(0.3,0.9,0.3,1)]"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={compact ? option.label : undefined}
          onClick={() => onChange(option.value)}
          className={clsx(
            "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150",
            small ? "h-[22px] px-2 text-[11.5px]" : "h-7 px-2.5 text-[12.5px]",
            option.value === value ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          {option.icon}
          <span className={clsx(compact && option.icon && "max-sm:sr-only")}>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

interface SwitchProps {
  readonly label: string;
  readonly hint?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Switch({ label, hint, checked, onChange }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2.5 py-2 transition-colors hover:bg-line">
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {hint ? <span className="text-[11.5px] text-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className={clsx(
          "relative h-5 w-8.5 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors duration-200",
          "before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-sm before:transition-transform before:duration-200",
          "checked:bg-accent checked:before:translate-x-3.5",
        )}
      />
    </label>
  );
}
