"use client";

import type { ReactNode } from "react";
import { Maximize2, X } from "lucide-react";
import type { useExpandedView } from "@/components/workspace/useExpandedView";

export type HydrogenView = "orbit" | "energy" | "spectrum";

/**
 * One scientific view of the hydrogen lab, with its own enlarge / exit control.
 *
 * Enlarging restyles this same element, so the selected transition, the electron and each view's
 * own presentation (spectrum range, orbit scale) are exactly what they were. `caption` carries the
 * linked selection into the enlarged view; pass null whenever the evidence policy hides it.
 */
export function ViewCard({ view, number, title, subtitle, className, expander, caption, children }: {
  view: HydrogenView;
  number: number;
  title: string;
  subtitle: ReactNode;
  className: string;
  expander: ReturnType<typeof useExpandedView<HydrogenView>>;
  caption: ReactNode | null;
  children: ReactNode;
}) {
  const isExpanded = expander.expanded === view;
  return (
    <section
      ref={expander.bind(view)}
      className={`viewport-card ${className}`}
      data-view={view}
      data-expanded={isExpanded}
      role={isExpanded ? "dialog" : undefined}
      aria-modal={isExpanded ? true : undefined}
      aria-label={isExpanded ? `放大：${title}` : undefined}
    >
      <div className="card-label">
        <span>{number}</span>
        <div><strong>{title}</strong><small>{subtitle}</small></div>
      </div>
      <div className="hydrogen-view-tools">
        {isExpanded ? (
          <>
            <button onClick={() => void expander.requestFullscreen()}>全螢幕</button>
            <button data-expanded-exit onClick={expander.collapse}><X size={16} /> 退出放大</button>
          </>
        ) : (
          <button className="hydrogen-expand" aria-label={`放大${title}`} title="放大這張圖" data-testid={`expand-${view}`} onClick={(event) => expander.expand(view, event.currentTarget)}>
            <Maximize2 size={16} />
          </button>
        )}
      </div>
      {isExpanded && expander.notice ? <p className="hydrogen-expand-notice" role="status">{expander.notice}</p> : null}
      {children}
      {isExpanded && caption ? <p className="hydrogen-expand-caption" data-testid="expand-caption">{caption}</p> : null}
    </section>
  );
}
