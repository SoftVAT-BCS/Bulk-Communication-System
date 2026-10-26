import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Workspace } from "../apps/web/src/workspace";
import { syntheticCsv } from "../apps/web/src/communication";
import { recipients } from "../apps/web/src/synthetic";
import { popupPlacement } from "../packages/ui/src/popover";

describe("V1 fidelity interactions (jsdom, not pixel acceptance)", () => {
  it("bounds placement at every required width, including a right-edge anchor", () => {
    for (const width of [320,375,390,480,760,768,1000,1220,1280,1440]) {
      const box = popupPlacement({ left: width - 20, top: 700, bottom: 739 }, width, 800, 300);
      expect(box.left).toBeGreaterThanOrEqual(12);
      expect(box.left + box.width).toBeLessThanOrEqual(width - 12);
      expect(box.top + box.maxHeight).toBeLessThanOrEqual(788);
    }
  });
  it("uses aligned checkbox options, cascades subgroups, preserves selection, handles IME and focus return", async () => {
    const user = userEvent.setup(); render(<Workspace page="Communication" />);
    await user.click(screen.getByRole("button", { name: "Select all matching" }));
    await user.click(screen.getByRole("button", { name: "Batch / Subgroup All subgroups" }));
    await user.click(screen.getByRole("option", { name: "React JS · Batch A" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    const trigger = screen.getByRole("button", { name: "Course / Group All groups" });
    await user.click(trigger);
    const option = screen.getByRole("option", { name: "Data Science & AI" });
    expect(getComputedStyle(option).display).toBe("flex");
    expect(getComputedStyle(option).gap).toBe("9px");
    expect(option.querySelector(".bcs-checkbox")?.getAttribute("aria-hidden")).toBe("true");
    await user.click(option);
    expect(option.getAttribute("aria-selected")).toBe("true");
    const input = screen.getByRole("combobox", { name: "Search Course / Group" });
    screen.getByRole("button", { name: "Done" }).focus(); await user.keyboard("{Tab}"); expect(document.activeElement).toBe(input);
    await user.keyboard("{Shift>}{Tab}{/Shift}"); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Done" }));
    input.focus();
    fireEvent.compositionStart(input); fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    expect(screen.getByRole("dialog", { name: "Choose groups" })).toBeTruthy();
    fireEvent.compositionEnd(input); await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole("button", { name: "Batch / Subgroup All subgroups" })).toBeTruthy();
    expect(screen.getByText("213 selected")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Batch / Subgroup All subgroups" }));
    expect(within(screen.getByRole("dialog")).getAllByRole("option")).toHaveLength(3);
    expect(screen.queryByRole("option", { name: "React JS · Batch A" })).toBeNull();
  });
  it("supports 10/20/50 rows, compact density, sorting and recipient details", async () => {
    const user = userEvent.setup(); render(<Workspace page="Communication" />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(11);
    for (const size of [20,50]) {
      await user.selectOptions(screen.getByLabelText("Rows per page"), String(size));
      expect(within(table).getAllByRole("row")).toHaveLength(size + 1);
    }
    await user.selectOptions(screen.getByLabelText("Density"), "Compact"); expect(table.classList.contains("compact")).toBe(true);
    await user.click(screen.getByRole("button", { name: /Student ID/ }));
    expect(screen.getByRole("columnheader", { name: /Student ID/ }).getAttribute("aria-sort")).toBe("ascending");
    await user.click(screen.getByRole("button", { name: "Details for STD-1001" }));
    expect(within(screen.getByRole("dialog")).getByText("Aarav Rao")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Details for STD-1001" }));
  });
  it("restores four Configuration presentations and scopes local rights previews by portal and role", async () => {
    const user = userEvent.setup(); render(<Workspace page="Configuration" />);
    expect(screen.getByRole("heading", { name: "Integration & configuration" })).toBeTruthy();
    await user.clear(screen.getByLabelText("Portal / application name")); await user.type(screen.getByLabelText("Portal / application name"), "Demo school");
    await user.click(screen.getByRole("tab", { name: "Table & Column Mapping" }));
    expect(screen.getByText(/Selected source: Demo school/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Normalized recipient preview" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Amazon SES" }));
    expect(screen.getAllByText("Not checked")).toHaveLength(3);
    await user.click(screen.getByRole("tab", { name: "User Rights" }));
    expect(screen.getAllByRole("switch")).toHaveLength(54);
    expect(within(screen.getByLabelText("Role / user")).getAllByRole("option")).toHaveLength(5);
    const label = "Send / Approve Communication / Recipients";
    expect((screen.getByRole("switch", { name: label }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("switch", { name: label }));
    await user.selectOptions(within(screen.getByRole("tabpanel", { name: "User Rights" })).getByRole("combobox", { name: "Connected portal" }), "SoftVAT CRM");
    expect((screen.getByRole("switch", { name: label }) as HTMLInputElement).checked).toBe(true);
    await user.selectOptions(within(screen.getByRole("tabpanel", { name: "User Rights" })).getByRole("combobox", { name: "Connected portal" }), "SkillMonk Academy");
    expect((screen.getByRole("switch", { name: label }) as HTMLInputElement).checked).toBe(false);
    await user.selectOptions(screen.getByLabelText("Role / user"), "Read-only Auditor");
    expect(screen.getAllByRole("switch").filter(item => (item as HTMLInputElement).checked)).toHaveLength(9);
    await user.click(screen.getByRole("button", { name: "Save access matrix" }));
    expect(screen.getByRole("dialog").textContent).toContain("Nothing was saved, connected, queried, verified or granted");
  });
  it("exports only fictional rows and quotes CSV formula-like input safely", () => {
    const csv = syntheticCsv([{ ...recipients[0], name: '=HYPERLINK("example")' }]);
    expect(csv).toContain('"\'=HYPERLINK(""example"")"');
    expect(csv).toContain("@example.com"); expect(csv.split("\r\n")).toHaveLength(2);
  });
});
