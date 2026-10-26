import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecipientSelection } from "../apps/web/src/communication";
import { initialQuery } from "../apps/web/src/synthetic";
import { cascadeDatabaseGroups, fetchRead, useDatabaseRecipients } from "../apps/web/src/client-recipients";
import { renderHook } from "@testing-library/react";
const id = "11111111-1111-1111-1111-111111111111";
const row = { id, targetId: "DEMO-1", name: "Test Recipient", email: "test@example.com", groupId: "", group: "Stored Group", subgroup: "Stored Batch", stage: "Demo", status: "Active", joined: "2026-10-17" };
const options = { groups: [{ id, name: "Stored Group" }], subgroups: [{ id, name: "Stored Batch", groupId: id }] };
function reply(data: unknown) { return Promise.resolve(Response.json({ data, mode: "database", requestId: "test-request" })); }
afterEach(() => { vi.unstubAllGlobals(); });
it("labels offline fixtures explicitly", () => {
  render(<RecipientSelection selected={new Set()} setSelected={() => {}} onCompose={() => {}} />);
  expect(screen.getByText("Synthetic UI Demo")).toBeTruthy();
});
it("renders server DTOs with stored filters and disables unimplemented bulk actions", async () => {
  const fetcher = vi.fn((url: string) => reply(url.includes("options") ? options : url.includes("?") ? { rows: [row], total: 1, eligible: 1, meta: { page: 0, size: 10 } } : { ...row, stateName: "Test State", mobileNo: "+910000000000" }));
  vi.stubGlobal("fetch", fetcher);
  render(<RecipientSelection database selected={new Set()} setSelected={() => {}} onCompose={() => {}} />);
  expect(screen.getByText("Database mode — loading")).toBeTruthy();
  await screen.findByText("BCS Development Database — Read-only");
  expect(screen.getByText("DEMO-1")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Select all matching" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: /Continue to compose/ }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: `Details for ${id}` }));
  await screen.findByText("Test State");
  expect(screen.getByText(/Synthetic contact \/ not dialable/)).toBeTruthy();
});
it("network failure never falls back to the 240 fixture rows", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Network unavailable"))));
  render(<RecipientSelection database selected={new Set()} setSelected={() => {}} onCompose={() => {}} />);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Network unavailable");
  expect(screen.queryByText("Synthetic UI Demo")).toBeNull();
  expect(screen.queryByText("BCS Development Database — Read-only")).toBeNull();
});
it("aborts old requests and ignores late results after a changed search", async () => {
  let resolveOld: ((value: Response) => void) | undefined;
  const signals: AbortSignal[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => {
    if (url.includes("options")) return reply(options);
    signals.push(init.signal as AbortSignal);
    if (url.includes("search=old")) return new Promise<Response>(resolve => { resolveOld = resolve; });
    return reply({ rows: [], total: 0, eligible: 0, meta: { page: 0, size: 10 } });
  }));
  const { result, rerender } = renderHook(({ search }) => useDatabaseRecipients(true, { ...initialQuery, search }, 0, 10, null), { initialProps: { search: "old" } });
  await waitFor(() => expect(resolveOld).toBeDefined());
  rerender({ search: "new" });
  await waitFor(() => expect(result.current.result?.total).toBe(0));
  expect(signals[0].aborted).toBe(true);
  await act(async () => { resolveOld?.(Response.json({ mode: "database", requestId: "old", data: { rows: [row], total: 99 } })); });
  expect(result.current.result?.total).toBe(0);
});

it("uses stored subgroup IDs when changing or clearing group selections", () => {
  const query = { ...initialQuery, subgroups: [id] };
  expect(cascadeDatabaseGroups(query, [], options).subgroups).toEqual([id]);
  expect(cascadeDatabaseGroups(query, [id], options).subgroups).toEqual([id]);
  expect(cascadeDatabaseGroups(query, ["other-stored-group"], options).subgroups).toEqual([]);
});
it("rejects expired requests and unsuccessful/malformed envelopes", async () => {
  const controller = new AbortController(); controller.abort();
  vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => init.signal?.aborted ? Promise.reject(new DOMException("Aborted", "AbortError")) : Promise.resolve(Response.json({ mode: "synthetic", data: [] }))));
  await expect(fetchRead("/api/bcs/v1/recipients", controller.signal)).rejects.toThrow();
  await expect(fetchRead("/api/bcs/v1/recipients", new AbortController().signal)).rejects.toThrow("Invalid server response");
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({}, { status: 400 }))));
  await expect(fetchRead("/api/bcs/v1/recipients", new AbortController().signal)).rejects.toThrow("Invalid recipient filters");
});

it("creates all-matching snapshots through the server without downloading matching rows", async()=>{
 const onSnapshot=vi.fn(),onCompose=vi.fn(),setSelected=vi.fn();
 const fetcher=vi.fn((url:string,init?:RequestInit)=>{
  if(url.includes('/selections'))return reply(init?.method==='POST'?{id,count:213}:{ids:[id],count:213});
  return reply(url.includes('options')?options:{rows:[row],total:240,eligible:213,meta:{page:0,size:10}});
 });vi.stubGlobal('fetch',fetcher);
 render(<RecipientSelection database onSnapshot={onSnapshot} selected={new Set()} setSelected={setSelected} onCompose={onCompose} />);
 await screen.findByText('DEMO-1');fireEvent.click(screen.getByRole('button',{name:'Select all matching'}));
 await waitFor(()=>expect(onSnapshot).toHaveBeenCalledWith(id));
 const post=fetcher.mock.calls.find(([u,i])=>u.includes('/selections')&&i?.method==='POST');
 expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({mode:'all_matching'});
 expect(JSON.parse(String(post?.[1]?.body))).not.toHaveProperty('ids');
 fireEvent.click(screen.getByRole('button',{name:/Continue to compose/}));expect(onCompose).toHaveBeenCalled();
});
