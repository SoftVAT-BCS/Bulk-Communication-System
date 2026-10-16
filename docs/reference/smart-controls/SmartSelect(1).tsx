"use client";
import { useField } from "./forms/FormContext";

import { Children, Fragment, isValidElement, useState, type ReactNode, type CSSProperties } from "react";
import SmartSearchLookup, { type SmartLookupColumn } from "./SmartSearchLookup";

export type SmartSelectOption = { id: string; label: string; description?: string; context?: string; disabled?: boolean };
// Deliberately a value-change contract, not a fabricated DOM/SyntheticEvent.
export type SmartSelectChangeEvent = { target: { name: string; value: string }; currentTarget: { name: string; value: string } };
export type SmartSelectProps = {
    label?: string;
    "aria-label"?: string;
    id?: string;
    name?: string;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (event: SmartSelectChangeEvent) => void;
    children?: ReactNode;
    options?: SmartSelectOption[];
    disabled?: boolean;
    required?: boolean;
    className?: string;
    style?: CSSProperties;
    detailHeader?: string;
    contextHeader?: string;
    isLoading?: boolean;
    errorMessage?: string;
};

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean; "data-description"?: string; "data-context"?: string };
export function optionText(node: ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (isValidElement<{ children?: ReactNode }>(node)) return optionText(node.props.children);
    return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : "").join("");
}

// Existing option JSX remains declarative data; no native select/option is mounted.
// Keeping its scoped map/conditions avoids copying business rules into the UI layer.
export function readOptions(children: ReactNode): SmartSelectOption[] {
    return Children.toArray(children).flatMap(child => {
        if (!isValidElement<OptionProps>(child)) return [];
        if (child.type === Fragment || child.type === "optgroup") return readOptions(child.props.children);
        if (child.type !== "option") return [];
        const label = optionText(child.props.children);
        return [{ id: String(child.props.value ?? label), label, disabled: child.props.disabled,
            description: child.props["data-description"], context: child.props["data-context"] }];
    });
}

export default function SmartSelect({ label, "aria-label": ariaLabel, id, name, value, defaultValue, onChange, children, options,
    disabled, required, className = "", detailHeader = "Details", contextHeader = "Context", isLoading, errorMessage }: SmartSelectProps) {
    const field = useField();
    const rows = options ?? readOptions(children);
    const [localValue, setLocalValue] = useState(() => String(defaultValue ?? rows.find(row => !row.disabled)?.id ?? ""));
    const [previousDefault, setPreviousDefault] = useState(defaultValue);
    if (previousDefault !== defaultValue) {
        setPreviousDefault(defaultValue);
        if (value === undefined) setLocalValue(String(defaultValue ?? rows.find(row => !row.disabled)?.id ?? ""));
    }
    const selectedValue = value === undefined ? localValue : String(value);
    const selected = rows.find(row => row.id === selectedValue);
    const emptyOption = rows.find(row => row.id === "" && !row.disabled);
    const selectedRows = selectedValue ? [selected ?? { id: selectedValue, label: "Saved selection unavailable" }] : [];
    const columns: SmartLookupColumn<SmartSelectOption>[] = [ { key: "label", header: label || ariaLabel || "Option", width: 210, text: row => row.label, render: row => row.label } ];
    if (rows.some(row => row.description)) columns.push({ key: "description", header: detailHeader, width: 180, text: row => row.description || "", render: row => row.description || "—" });
    if (rows.some(row => row.context)) columns.push({ key: "context", header: contextHeader, width: 180, text: row => row.context || "", render: row => row.context || "—" });
    function change(nextValue: string) {
        setLocalValue(nextValue);
        const target = { name: name || "", value: nextValue };
        onChange?.({ target, currentTarget: target });
    }
    // Retain layout spacing while the shared control owns all visual dimensions.
    const layoutClasses = className.split(/\s+/).filter(token => /^(m[trblxy]?(-|\[)|(?:sm:|md:|lg:)?(?:w-|min-w-|max-w-|flex-))/.test(token)).join(" ");
    return <SmartSearchLookup<SmartSelectOption> label={label || field?.label || ariaLabel || name || "Select option"} hideLabel={!label && (Boolean(field) || Boolean(ariaLabel))} id={id || field?.id} name={name}
        className={`sv-select-adapter ${layoutClasses}`} rows={rows} valueLabel={selectedValue ? selected?.label || selectedRows[0]?.label || "" : ""}
        placeholder={emptyOption?.label || "Select"} searchPlaceholder="Type to search…" selectedRows={selectedRows} columns={columns}
        disabled={disabled} required={required} invalid={className.includes("sv-border") || Boolean(errorMessage)} isLoading={isLoading} errorMessage={errorMessage}
        clearable={Boolean(emptyOption)} getSearchText={row => [row.label, row.description, row.context].filter(Boolean).join(" ")}
        getOptionLabel={row => row.label} isOptionDisabled={row => Boolean(row.disabled)} onSelect={row => change(row.id)} onFormReset={() => { if(value === undefined) setLocalValue(String(defaultValue ?? rows.find(row => !row.disabled)?.id ?? "")); }} onClear={() => change("")} />;
}
