import type { Recipient, RecipientProvider, RecipientQuery, RecipientStatus } from "@bcs/contracts";
export const groups = [
  { value: "fullstack", label: "Full Stack Development", subgroups: ["React JS · Batch A", "Node.js · Batch B", "Java Full Stack · Batch C"] },
  { value: "ai", label: "Data Science & AI", subgroups: ["Python · Morning", "Machine Learning · Evening", "GenAI · Weekend"] },
  { value: "marketing", label: "Digital Marketing", subgroups: ["SEO · Batch A", "Performance Ads · Batch B", "Analytics · Weekend"] },
  { value: "design", label: "Design & UX", subgroups: ["UI Fundamentals · Batch A", "Figma · Evening", "Product Design · Weekend"] },
];
// Deterministic fictional name vocabulary/formula matches the approved IPX demo.
const firstNames = ["Aarav", "Ananya", "Vihaan", "Ishita", "Aditya", "Meera", "Rohan", "Kavya", "Arjun", "Nisha", "Kiran", "Neha", "Rahul", "Sahana", "Vikram", "Pooja", "Yash", "Diya", "Manish", "Sanjana", "Naveen", "Aditi", "Pranav", "Swathi"];
const lastNames = ["Rao", "Sharma", "Nadig", "Shetty", "Patel", "Kumar", "Joshi", "Gowda", "Bhat", "Menon", "Kulkarni", "Shah", "Reddy", "Desai", "Naik", "Gupta", "Prasad", "Iyer", "Jain", "Hegde"];
export const recipients: Recipient[] = Array.from({ length: 240 }, (_, i) => {
  const group = groups[Math.floor(i / 60)];
  const first = firstNames[(i * 7 + Math.floor(i / 9)) % firstNames.length];
  const last = lastNames[(i * 3 + Math.floor(i / 13)) % lastNames.length];
  const status: RecipientStatus = i % 37 === 0 ? "Bounced" : i % 29 === 0 ? "Unsubscribed" : i % 19 === 0 ? "Inactive" : "Active";
  return { id: `STD-${1001 + i}`, name: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@example.com`, groupId: group.value, group: group.label, subgroup: group.subgroups[Math.floor(i % 60 / 20)], stage: ["Enrolled", "In progress", "Completed"][Math.floor(i / 3) % 3], status, joined: `${String(2 + i % 24).padStart(2, "0")} Sep 2026` };
});
export const initialQuery: RecipientQuery = { search: "", groups: [], subgroups: [], status: "All statuses", sort: "name", descending: false };
export const eligible = (row: Recipient) => row.status === "Active";
export function matching(query: RecipientQuery): Recipient[] {
  const term = query.search.trim().toLowerCase();
  return recipients.filter(row => (!query.groups.length || query.groups.includes(row.groupId)) && (!query.subgroups.length || query.subgroups.includes(row.subgroup)) && (query.status === "All statuses" || row.status === query.status) && [row.id, row.name, row.email, row.group, row.subgroup, row.status].some(value => value.toLowerCase().includes(term)))
    .sort((a, b) => a[query.sort].localeCompare(b[query.sort]) * (query.descending ? -1 : 1));
}
export const syntheticProvider: RecipientProvider = {
  scope: { portalId: "fictional-academy", mode: "synthetic" },
  page(query, page, size) { const all = matching(query); return { rows: all.slice(page * size, (page + 1) * size), total: all.length, eligible: all.filter(eligible).length }; },
  matchingEligibleIds(query) { return matching(query).filter(eligible).map(row => row.id); },
};
export function cascadeGroups(query: RecipientQuery, values: readonly string[]): RecipientQuery {
  const available = groups.filter(group => !values.length || values.includes(group.value)).flatMap(group => group.subgroups);
  return { ...query, groups: values, subgroups: query.subgroups.filter(value => available.includes(value)) };
}
export function updateSelection(current: ReadonlySet<string>, ids: readonly string[], selected: boolean): Set<string> {
  const next = new Set(current);
  const allowed = new Set(recipients.filter(eligible).map(row => row.id));
  for (const id of ids) { if (selected && allowed.has(id)) next.add(id); else next.delete(id); }
  return next;
}
