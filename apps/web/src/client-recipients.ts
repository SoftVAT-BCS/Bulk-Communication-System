"use client";
import type { AudienceOptions, DatabaseRecipientPage, RecipientDetails, RecipientQuery, ReadResponse } from "@bcs/contracts";
import { useEffect, useState } from "react";
export function cascadeDatabaseGroups(query: RecipientQuery, groups: readonly string[], options: AudienceOptions): RecipientQuery {
  return { ...query, groups, subgroups: query.subgroups.filter(id => options.subgroups.some(s => s.id === id && (!groups.length || groups.includes(s.groupId)))) };
}
export function recipientUrl(query: RecipientQuery, page: number, size: number) {
  return `/api/bcs/v1/recipients?${new URLSearchParams({ search: query.search, groups: query.groups.join(","), subgroups: query.subgroups.join(","), status: query.status, sort: query.sort, descending: String(query.descending), page: String(page), size: String(size) })}`;
}
export async function fetchRead<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(response.status === 400 ? "Invalid recipient filters. Clear the filters and try again." : "Database unavailable. Ask the owner to verify the restricted role and server configuration.");
  const body = await response.json() as ReadResponse<T>;
  if (body.mode !== "database" || !body.requestId || body.data === undefined) throw new Error("Invalid server response.");
  return body.data;
}
export function useDatabaseRecipients(enabled: boolean, query: RecipientQuery, page: number, size: number, detailId: string | null, refresh = 0) {
  const [options, setOptions] = useState<AudienceOptions>({ groups: [], subgroups: [] });
  const [state, setState] = useState<{ key: string; result?: DatabaseRecipientPage; error?: string }>({ key: "" });
  const [detail, setDetail] = useState<{ id: string; result?: RecipientDetails; error?: string }>({ id: "" });
  const url = recipientUrl(query, page, size);
  useEffect(() => {
    if (!enabled || refresh < 0) return;
    const controller = new AbortController(); let current = true;
    const timer = setTimeout(async () => {
      try {
        const [nextOptions, result] = await Promise.all([fetchRead<AudienceOptions>("/api/bcs/v1/audience/options", controller.signal), fetchRead<DatabaseRecipientPage>(url, controller.signal)]);
        if (current) { setOptions(nextOptions); setState({ key: url, result }); }
      } catch (error) { if (current) setState({ key: url, error: error instanceof Error ? error.message : "Database unavailable." }); }
    }, 250);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [enabled, url, refresh]);
  useEffect(() => {
    if (!enabled || !detailId) return;
    const controller = new AbortController(); let current = true;
    fetchRead<RecipientDetails>(`/api/bcs/v1/recipients/${encodeURIComponent(detailId)}`, controller.signal).then(result => { if (current) setDetail({ id: detailId, result }); }).catch(error => { if (current) setDetail({ id: detailId, error: error instanceof Error ? error.message : "Details unavailable." }); });
    return () => { current = false; controller.abort(); };
  }, [enabled, detailId]);
  return { options, result: state.key === url ? state.result : undefined, error: state.key === url ? state.error : undefined, detail: detail.id === detailId ? detail.result : undefined, detailError: detail.id === detailId ? detail.error : undefined };
}
