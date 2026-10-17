"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ActionButton } from "./primitives";
export function EmailModal({ title, children, footer, onRequestClose, compact = false }: { title: string; children: ReactNode; footer?: ReactNode; onRequestClose(): void; compact?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; const dialog = ref.current; dialog?.showModal(); dialog?.querySelector<HTMLElement>(".bcs-email-modal-body input, .bcs-email-modal-body button, .bcs-email-modal-body [contenteditable=true]")?.focus(); return () => { dialog?.close(); queueMicrotask(() => { if (opener?.isConnected) opener.focus(); }); }; }, []);
  return <dialog ref={ref} aria-labelledby={id} className={`bcs-email-modal ${compact ? "bcs-email-modal-compact" : ""}`} onCancel={event => { event.preventDefault(); onRequestClose(); }} onKeyDownCapture={event => {
    if (event.nativeEvent.isComposing || (event.target as HTMLElement).closest("dialog") !== event.currentTarget) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onRequestClose(); }
    if (event.key === "Tab") { const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contenteditable=true],[tabindex="0"]')].filter(node => node.tabIndex >= 0 && !node.closest("[hidden]")); const first = nodes[0], last = nodes[nodes.length-1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
  }} onPointerDown={event => { if (event.target !== event.currentTarget) return; const b = event.currentTarget.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) { event.preventDefault(); onRequestClose(); } }}>
    <header className="bcs-email-modal-head"><div><div className="eyebrow">EMAIL DESIGN STUDIO</div><h2 id={id}>{title}</h2></div><ActionButton aria-label={`Close ${title}`} onClick={onRequestClose}>Close ✕</ActionButton></header>
    <div className="bcs-email-modal-body">{children}</div>{footer && <footer className="bcs-email-modal-foot">{footer}</footer>}
  </dialog>;
}
export function EmailConfirm({ title, children, onConfirm, onCancel, confirmLabel = "Discard changes" }: { title: string; children: ReactNode; onConfirm(): void; onCancel(): void; confirmLabel?: string }) {
  return <EmailModal title={title} compact onRequestClose={onCancel} footer={<><ActionButton onClick={onCancel}>Keep editing</ActionButton><ActionButton primary onClick={onConfirm}>{confirmLabel}</ActionButton></>}><p>{children}</p></EmailModal>;
}
