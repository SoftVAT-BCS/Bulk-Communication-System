"use client";
import { useId, type HTMLInputTypeAttribute } from "react";
export function LabeledField({ label, value, onChange, options, full, type = "text", disabled = false }: {
  label: string; value: string; onChange?(value: string): void; options?: readonly { value: string; label: string }[];
  full?: boolean; type?: HTMLInputTypeAttribute; disabled?: boolean;
}) {
  const id = useId();
  return <div className={`field ${full ? "span2" : ""}`}><label className="label" htmlFor={id}>{label}</label>{options ? <select className="select" id={id} value={value} disabled={disabled} onChange={event => onChange?.(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input className="input" id={id} type={type} value={value} disabled={disabled} readOnly={!onChange} onChange={event => onChange?.(event.target.value)} />}</div>;
}
export function PermissionSwitch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange(value: boolean): void }) {
  return <input className="toggle" type="checkbox" role="switch" aria-checked={checked} aria-label={label} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />;
}
