"use client";
import { useState } from "react";
import SmartSearchLookup from "./SmartSearchLookup";
import type { SmartSelectOption } from "./SmartSelect";

export default function SmartMultiSelect({ label, name, options, value, defaultValue = [], onChange, disabled, required, isLoading, errorMessage }: {
  label: string; name?: string; options: SmartSelectOption[]; value?: string[];
  defaultValue?: string[]; onChange?: (ids: string[]) => void; disabled?: boolean;
  required?: boolean; isLoading?: boolean; errorMessage?: string;
}) {
  const [local, setLocal] = useState(defaultValue);
  const ids = value ?? local;
  const selected = ids.map(id => options.find(row => row.id === id) ?? { id, label: "Saved selection unavailable" });
  const change = (next: string[]) => { setLocal(next); onChange?.(next); };
  return <SmartSearchLookup label={label} name={name} rows={options} multi selectedRows={selected}
    valueLabel={ids.length ? `${ids.length} selected` : ""} disabled={disabled} required={required}
    isLoading={isLoading} errorMessage={errorMessage} getOptionLabel={row => row.label}
    getSearchText={row => [row.label, row.description, row.context].filter(Boolean).join(" ")}
    isOptionDisabled={row => Boolean(row.disabled)}
    columns={[{ key: "label", header: "Option", render: row => row.label }, { key: "description", header: "Details", render: row => row.description || "—" }]}
    onClear={() => change([])} onSelect={row => change(ids.includes(row.id) ? ids.filter(id => id !== row.id) : [...ids, row.id])} />;
}
