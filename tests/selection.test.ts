import { describe, expect, it } from "vitest";
import { cascadeGroups, initialQuery, recipients, syntheticProvider, updateSelection } from "../apps/web/src/synthetic";
describe("synthetic recipient provider", () => {
  it("uses 240 unique fictional records and never selects a suppressed/inactive record", () => {
    expect(new Set(recipients.map(row => row.id)).size).toBe(240);
    expect(recipients.every(row => row.email.endsWith("@example.com"))).toBe(true);
    const selected = updateSelection(new Set(), recipients.map(row => row.id), true);
    expect(selected.size).toBe(recipients.filter(row => row.status === "Active").length);
    expect(recipients.filter(row => row.status !== "Active").every(row => !selected.has(row.id))).toBe(true);
  });
  it("distinguishes page selection from all matching and preserves off-filter IDs", () => {
    const first = syntheticProvider.page(initialQuery, 0, 10);
    const pageSelection = updateSelection(new Set(), first.rows.map(row => row.id), true);
    const all = updateSelection(pageSelection, syntheticProvider.matchingEligibleIds(initialQuery), true);
    expect(all.size).toBeGreaterThan(pageSelection.size);
    const filtered = { ...initialQuery, groups: ["ai"] };
    const remaining = updateSelection(all, syntheticProvider.matchingEligibleIds(filtered), false);
    expect(remaining.has("STD-1002")).toBe(true);
    expect(syntheticProvider.matchingEligibleIds(filtered).some(id => remaining.has(id))).toBe(false);
  });
  it("cascades subgroups and filters before paginating and sorting", () => {
    const query = cascadeGroups({ ...initialQuery, subgroups: ["React JS · Batch A"] }, ["ai"]);
    expect(query.subgroups).toEqual([]);
    expect(syntheticProvider.page(query, 0, 20).total).toBe(60);
    expect(syntheticProvider.page(query, 1, 20).rows).toHaveLength(20);
    const first = syntheticProvider.page({ ...initialQuery, sort: "id", descending: true }, 0, 10);
    expect(first.rows[0].id).toBe("STD-1240");
    expect(syntheticProvider.page({ ...initialQuery, search: "not a learner" }, 0, 10).total).toBe(0);
  });
});
