"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent } from "react";
import type { Locale } from "@/lib/i18n";
import { applyTheme, readStoredTheme, subscribeTheme } from "@/lib/theme";
import "./theme-menu.css";

const copy = {
  "zh-TW": { label: "外觀", light: "亮色", dark: "暗色", system: "跟隨系統" },
  en: { label: "Appearance", light: "Light", dark: "Dark", system: "System" },
} as const;

const icons = { light: Sun, dark: Moon, system: Monitor } as const;
const targets = ["light", "dark", "system"] as const;

/** `menu` (the default) is a single icon button opening a labelled list; the Catalog and every model
 *  workspace use it, at the end of the header's action row. `segmented` is the older three-button group,
 *  kept only for pages that have not moved yet and requested explicitly. Both drive the same stored choice. */
export default function ThemeToggle({ locale = "zh-TW", variant = "menu" }: { locale?: Locale; variant?: "segmented" | "menu" }) {
  const text = copy[locale];
  // The pre-paint script already applied the stored choice to <html>; the store only drives which
  // button reads as pressed, so the server render assumes "system" and the client corrects it.
  const mode = useSyncExternalStore(subscribeTheme, readStoredTheme, () => "system" as const);

  if (variant === "menu") return <ThemeMenu mode={mode} text={text} />;

  return (
    <div className="theme-switcher" role="group" aria-label={text.label}>
      {targets.map((target) => {
        const Icon = icons[target];
        return (
          <button
            key={target}
            type="button"
            title={text[target]}
            aria-label={text[target]}
            aria-pressed={mode === target}
            onClick={() => applyTheme(target)}
          >
            <Icon size={14} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function ThemeMenu({ mode, text }: { mode: (typeof targets)[number]; text: (typeof copy)[Locale] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const Current = icons[mode];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Keep the list inside the viewport: flip to the left-aligned or upward position only when the default
  // (below, right edges aligned) would be clipped. Measured after layout so it never paints in the wrong place.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    list.removeAttribute("data-align");
    list.removeAttribute("data-side");
    const rect = list.getBoundingClientRect();
    if (rect.left < 8) list.setAttribute("data-align", "start");
    const anchor = root.current?.getBoundingClientRect();
    if (anchor && rect.bottom > window.innerHeight - 8 && anchor.top - rect.height - 8 >= 8) list.setAttribute("data-side", "top");
  }, [open]);

  const options = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".theme-menu__option") ?? []);
  const close = () => { setOpen(false); trigger.current?.focus(); };

  // A disclosure holding a group of toggle buttons, not an ARIA menu: Tab still walks the options,
  // arrow keys are a convenience, and leaving the widget (Tab away or a click elsewhere) closes it.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) { event.stopPropagation(); close(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) { setOpen(true); requestAnimationFrame(() => options()[Math.max(0, targets.indexOf(mode))]?.focus()); return; }
    const list = options();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = at < 0 ? (event.key === "ArrowDown" ? 0 : list.length - 1) : (at + (event.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    // relatedTarget is null for clicks in browsers that do not focus buttons (Safari); the pointerdown
    // handler covers those, so only a real move of focus elsewhere closes here.
    const next = event.relatedTarget as Node | null;
    if (open && next && !root.current?.contains(next)) setOpen(false);
  };

  return (
    <div className="theme-menu" ref={root} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={trigger}
        type="button"
        className="theme-menu__trigger"
        aria-label={`${text.label}：${text[mode]}`}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Current size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="theme-menu__list" ref={listRef} id={listId} role="group" aria-label={text.label}>
          <span className="theme-menu__title" aria-hidden="true">{text.label}</span>
          {targets.map((target) => {
            const Icon = icons[target];
            return (
              <button
                key={target}
                type="button"
                className="theme-menu__option"
                aria-pressed={mode === target}
                onClick={() => { applyTheme(target); close(); }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{text[target]}</span>
                {mode === target && <Check size={16} aria-hidden="true" className="theme-menu__check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
