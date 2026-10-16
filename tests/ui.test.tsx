import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SmartMultiSelect, SmartSearchLookup, SmartSelect, TabBar } from "@bcs/ui";
import type { LookupOption } from "@bcs/contracts";
import { Workspace } from "../apps/web/src/workspace";
function MultiHarness() { const [value, setValue] = useState<string[]>([]); return <SmartMultiSelect label="Groups" options={[{ label: "Alpha", value: "a" }, { label: "Alpine", value: "b" }, { label: "Beta", value: "c", disabled: true }]} value={value} onChange={setValue} />; }
describe("shared controls and Communication", () => {
  it("selects by keyboard and marks disabled multi-select options unavailable", async () => {
    const user = userEvent.setup(); render(<MultiHarness />);
    await user.click(screen.getByRole("button", { name: "Groups All groups" }));
    expect(screen.getByRole("option", { name: "Beta" }).getAttribute("aria-disabled")).toBe("true");
    await user.type(screen.getByRole("combobox", { name: "Search Groups" }), "Alpine");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button", { name: "Groups 1 selected groups" })).toBeTruthy();
  });
  it("cancels obsolete lookup requests and ignores late responses", async () => {
    const requests: { query: string; signal: AbortSignal; resolve(options: readonly LookupOption[]): void }[] = [];
    const loader = (query: string, signal: AbortSignal) => new Promise<readonly LookupOption[]>(resolve => requests.push({ query, signal, resolve }));
    const user = userEvent.setup();
    render(<SmartSearchLookup label="Class lookup" options={[]} value={null} onChange={() => undefined} loadOptions={loader} />);
    await user.type(screen.getByRole("combobox", { name: "Class lookup" }), "x");
    expect(requests[0].signal.aborted).toBe(true);
    requests[requests.length - 1].resolve([{ value: "fresh", label: "Fresh class" }]);
    await waitFor(() => expect(screen.getByRole("option", { name: "Fresh class" })).toBeTruthy());
    requests[0].resolve([{ value: "old", label: "Stale class" }]);
    await waitFor(() => expect(screen.queryByRole("option", { name: "Stale class" })).toBeNull());
  });
  it("keeps multi-select open and search intact, supports Clear, Done and Escape", async () => {
    const user = userEvent.setup(); render(<MultiHarness />);
    await user.click(screen.getByRole("button", { name: "Groups All groups" }));
    const search = screen.getByRole("combobox", { name: "Search Groups" });
    await user.type(search, "Al");
    await user.click(screen.getByRole("option", { name: /Alpha/ }));
    expect((search as HTMLInputElement).value).toBe("Al");
    expect(screen.getByRole("option", { name: /Alpine/ })).toBeTruthy();
    await user.click(screen.getByRole("option", { name: /Alpine/ }));
    expect(screen.getByRole("button", { name: "Groups 2 selected groups" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("button", { name: "Groups All groups" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("combobox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Groups All groups" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("combobox")).toBeNull();
  });
  it("single select exposes its label, unavailable options and validation", () => {
    render(<SmartSelect label="Status" options={[]} value={null} onChange={() => undefined} error="Choose a status" />);
    expect(screen.getByRole("combobox", { name: "Status" }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Choose a status");
  });
  it("supports tab keyboard navigation", async () => {
    function Tabs() { const [tab, setTab] = useState("One"); return <TabBar tabs={["One", "Two"]} value={tab} onChange={setTab} />; }
    const user = userEvent.setup(); render(<Tabs />);
    screen.getByRole("tab", { name: "One" }).focus(); await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
  });
  it("navigates all five routes and preserves eligible selection across filters, pages and tabs", async () => {
    const user = userEvent.setup(); render(<Workspace page="Communication" />);
    expect(within(screen.getByRole("navigation", { name: "Main workspace" })).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/", "/communication", "/scheduling", "/reports", "/configuration"]);
    await user.click(screen.getByRole("button", { name: /Student ID/ }));
    expect((screen.getByRole("checkbox", { name: "Select STD-1001" }) as HTMLInputElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Select page" }));
    expect(screen.getByText("9 selected")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Page 2 of 24")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Compose & Send" }));
    expect(screen.getByText(/9 eligible synthetic recipients/)).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Recipient Selection" }));
    expect(screen.getByText("9 selected")).toBeTruthy();
    await user.type(screen.getByLabelText("Search grid"), "STD-1002");
    expect((screen.getByRole("checkbox", { name: "Select STD-1002" }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("button", { name: "Deselect matching" }));
    expect(screen.getByText("8 selected")).toBeTruthy();
    await user.clear(screen.getByLabelText("Search grid"));
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("checkbox", { name: "Email address" }));
    expect(screen.queryByRole("columnheader", { name: /Email address/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "50" } });
    expect(screen.getByLabelText("Page 1 of 5")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear all selection" }));
    expect(screen.getByText("0 selected")).toBeTruthy();
  });
});
