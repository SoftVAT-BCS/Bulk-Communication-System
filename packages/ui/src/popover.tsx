"use client";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

export function popupPlacement(anchor: { left: number; top: number; bottom: number }, width: number, height: number, preferredWidth = 230) {
  const margin = 12;
  const panelWidth = Math.min(preferredWidth, Math.max(0, width - margin * 2));
  const panelHeight = Math.min(390, Math.max(0, height - margin * 2));
  return { left: Math.max(margin, Math.min(anchor.left, width - panelWidth - margin)),
    top: Math.max(margin, Math.min(anchor.bottom + 7, height - panelHeight - margin)),
    width: panelWidth, maxHeight: panelHeight };
}

/** Top layer prevents ancestor clipping; native modal semantics supply a focus trap. */
export function SelectionPopover({ label, anchor, onClose, children, wide = false }: {
  label: string; anchor: RefObject<HTMLButtonElement | null>; onClose(): void; children: ReactNode; wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const composing = useRef(false);
  useLayoutEffect(() => {
    const node = dialog.current;
    const trigger = anchor.current;
    if (!node || !trigger) return;
    const place = () => {
      const width = document.documentElement.clientWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const narrow = width <= 760;
      const placement = popupPlacement(trigger.getBoundingClientRect(), width, height, wide ? 300 : 230);
      Object.assign(node.style, { left: `${narrow ? 12 : placement.left}px`, top: narrow ? "auto" : `${placement.top}px`, bottom: narrow ? "12px" : "auto", width: narrow ? `${Math.max(0, width - 24)}px` : `${placement.width}px`, maxHeight: `${Math.min(390, height - 24)}px` });
      node.dataset.sheet = String(narrow);
    };
    place(); node.showModal();
    node.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); window.visualViewport?.removeEventListener("resize", place); node.close(); queueMicrotask(() => trigger.focus()); };
  }, [anchor, wide]);
  return <dialog ref={dialog} className="bcs-selection-popover" aria-label={label}
    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
    onKeyDownCapture={event => {
      if (composing.current && (event.key === "Escape" || event.key === "Enter")) { event.stopPropagation(); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === "Tab") {
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(item => item.tabIndex >= 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}
    onCancel={event => { event.preventDefault(); if (!composing.current) onClose(); }}
    onPointerDown={event => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) { event.preventDefault(); onClose(); } }}>
    {children}
  </dialog>;
}
