"use client";
import Select from "react-select";
import { useEffect, useId, useState } from "react";
import type { LookupLoader, LookupOption } from "@bcs/contracts";

interface BaseProps { label: string; options: readonly LookupOption[]; disabled?: boolean; loading?: boolean; error?: string; placeholder?: string }
export interface SmartSelectProps extends BaseProps { value: string | null; onChange(value: string | null): void }
const classNames = { control: () => "bcs-select-control", menu: () => "bcs-select-menu", option: (state: { isFocused: boolean; isSelected: boolean }) => `bcs-option ${state.isFocused ? "focused" : ""} ${state.isSelected ? "selected" : ""}`, input: () => "bcs-select-input", placeholder: () => "muted", valueContainer: () => "bcs-select-value" };
export function SmartSelect({ label, options, value, onChange, disabled, loading, error, placeholder }: SmartSelectProps) {
  const id = useId();
  return <div className="field bcs-select"><label htmlFor={id}>{label}</label><Select<LookupOption> unstyled instanceId={id} inputId={id} classNames={classNames} options={options} value={options.find(option => option.value === value) ?? null} onChange={option => onChange(option?.value ?? null)} isClearable isDisabled={disabled} isLoading={loading} isOptionDisabled={option => !!option.disabled} placeholder={placeholder ?? "Search and select…"} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} noOptionsMessage={() => "No available options"} />{error && <p role="alert" id={`${id}-error`}>{error}</p>}</div>;
}
export { SmartMultiSelect, type SmartMultiSelectProps } from "./multi-select";
export interface SmartSearchLookupProps extends SmartSelectProps { loadOptions?: LookupLoader }
export function SmartSearchLookup({ loadOptions, ...props }: SmartSearchLookupProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<readonly LookupOption[]>([]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => { if (!loadOptions) return; const controller = new AbortController(); setPending(true); setFailure(""); loadOptions(query, controller.signal).then(options => { if (!controller.signal.aborted) setLoaded(options); }).catch(() => { if (!controller.signal.aborted) setFailure("Lookup unavailable. Try again."); }).finally(() => { if (!controller.signal.aborted) setPending(false); }); return () => controller.abort(); }, [query, loadOptions]);
  const options = loadOptions ? loaded : props.options;
  const selected = [...props.options, ...loaded].find(option => option.value === props.value) ?? null;
  return <div className="field bcs-select"><label htmlFor={id}>{props.label}</label><Select<LookupOption> unstyled instanceId={id} inputId={id} classNames={classNames} options={options} filterOption={loadOptions ? null : undefined} value={selected} onChange={option => props.onChange(option?.value ?? null)} onInputChange={(text, action) => { if (action.action === "input-change") setQuery(text); }} isDisabled={props.disabled} isLoading={pending || props.loading} isClearable isOptionDisabled={option => !!option.disabled} formatOptionLabel={option => <span>{option.label}{option.description && <small className="bcs-description">{option.description}</small>}</span>} aria-invalid={!!(failure || props.error)} noOptionsMessage={() => "No matching records"} />{(failure || props.error) && <p role="alert">{failure || props.error}</p>}</div>;
}
