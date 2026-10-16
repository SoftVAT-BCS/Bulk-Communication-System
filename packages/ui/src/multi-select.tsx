"use client";
import Select, { components, type OptionProps } from "react-select";
import { useId, useRef, useState } from "react";
import type { LookupOption } from "@bcs/contracts";
import { Icon } from "./primitives";
import { SelectionPopover } from "./popover";

function CheckboxOption(props: OptionProps<LookupOption, true>) {
  return <components.Option {...props}><span className={`bcs-checkbox ${props.isSelected ? "checked" : ""}`} aria-hidden="true">{props.isSelected ? "✓" : ""}</span><span className="bcs-option-label">{props.label}{props.data.description && <small>{props.data.description}</small>}</span></components.Option>;
}
export interface SmartMultiSelectProps {
  label: string; options: readonly LookupOption[]; value: readonly string[];
  onChange(values: string[]): void; disabled?: boolean; loading?: boolean; error?: string; noun?: string;
}
export function SmartMultiSelect({ label, options, value, onChange, disabled, loading, error, noun }: SmartMultiSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const word = noun ?? label.toLowerCase();
  return <div className="field multi bcs-multi"><span className="label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="multi-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-labelledby={`${id}-label ${id}-count`} onClick={() => setOpen(!open)}>
      <span id={`${id}-count`}>{value.length ? <><strong>{value.length}</strong> selected {word}</> : `All ${word}`}</span><Icon name="down" />
    </button>
    {open && <SelectionPopover label={`Choose ${word}`} anchor={trigger} onClose={() => setOpen(false)} wide={word === "subgroups"}>
      <Select<LookupOption, true> unstyled instanceId={id} inputId={id} aria-label={`Search ${label}`} aria-invalid={!!error} isMulti menuIsOpen isLoading={loading}
        options={options} value={options.filter(option => value.includes(option.value))} onChange={items => onChange(items.map(item => item.value))}
        inputValue={query} onInputChange={(text, action) => { if (action.action === "input-change") setQuery(text); }}
        controlShouldRenderValue={false} hideSelectedOptions={false} closeMenuOnSelect={false} blurInputOnSelect={false} isClearable={false}
        isOptionDisabled={option => !!option.disabled} components={{ Option: CheckboxOption, DropdownIndicator: null, IndicatorSeparator: null }}
        placeholder={`Search ${word}…`} noOptionsMessage={() => "No matching options"} maxMenuHeight={210}
        styles={{
          control: base => ({ ...base, minHeight: 34, height: 34, border: "1px solid var(--line)", background: "var(--surface-2)", borderRadius: 8, padding: "0 8px", fontSize: 11 }),
          menu: base => ({ ...base, position: "static", boxShadow: "none", margin: "9px 0 0", padding: 0, border: 0, background: "transparent" }),
          menuList: base => ({ ...base, padding: 0 }),
          option: (base, state) => ({ ...base, display: "flex", alignItems: "center", gap: 9, padding: "8px 6px", minHeight: 38, fontSize: 11, borderRadius: 7, color: "var(--text)", background: state.isSelected ? "var(--accent-soft)" : state.isFocused ? "var(--surface-2)" : "transparent", opacity: state.isDisabled ? .45 : 1, cursor: state.isDisabled ? "not-allowed" : "pointer" }),
        }} />
      <div className="bcs-pop-footer"><button className="btn tiny" type="button" onClick={() => onChange([])}>Clear</button><button className="btn primary tiny" type="button" onClick={() => setOpen(false)}>Done</button></div>
    </SelectionPopover>}{error && <p role="alert">{error}</p>}
  </div>;
}
