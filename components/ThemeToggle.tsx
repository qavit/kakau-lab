"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { Locale } from "@/lib/i18n";
import { applyTheme, readStoredTheme, subscribeTheme } from "@/lib/theme";

const copy = {
  "zh-TW": { label: "外觀", light: "亮色", dark: "暗色", system: "跟隨系統" },
  en: { label: "Appearance", light: "Light", dark: "Dark", system: "System" },
} as const;

const icons = { light: Sun, dark: Moon, system: Monitor } as const;
const targets = ["light", "dark", "system"] as const;

/** `segmented` is the compact three-button group the model workspaces use; `menu` is a single icon
 *  button opening a labelled list, used by the catalog shell. Both drive the same stored choice. */
export default function ThemeToggle({ locale = "zh-TW", variant = "segmented" }: { locale?: Locale; variant?: "segmented" | "menu" }) {
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

  const options = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".theme-menu__option") ?? []);
  const close = () => { setOpen(false); trigger.current?.focus(); };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) { event.stopPropagation(); close(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) { setOpen(true); requestAnimationFrame(() => options()[Math.max(0, targets.indexOf(mode))]?.focus()); return; }
    const list = options();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    list[(at + step + list.length) % list.length]?.focus();
  };

  return (
    <div className="theme-menu" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="theme-menu__trigger"
        aria-label={`${text.label}：${text[mode]}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <Current size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="theme-menu__list" id={listId} role="group" aria-label={text.label}>
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
