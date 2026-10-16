/** Browser-safe contracts. Scope is illustrative and conveys no authorization. */
export type RecipientStatus = "Active" | "Inactive" | "Bounced" | "Unsubscribed";
export interface Recipient {
  id: string; name: string; email: string; groupId: string; group: string;
  subgroup: string; stage: string; status: RecipientStatus; joined: string;
}
export interface RecipientQuery {
  search: string; groups: readonly string[]; subgroups: readonly string[];
  status: RecipientStatus | "All statuses"; sort: keyof Recipient; descending: boolean;
}
export interface RecipientScope { portalId: string; mode: "synthetic" }
export interface RecipientPage { rows: Recipient[]; total: number; eligible: number }
export type SelectionIntent =
  | { kind: "explicit"; ids: readonly string[] }
  | { kind: "matching"; scope: RecipientScope; query: RecipientQuery; excludedIds: readonly string[] };
export interface RecipientProvider {
  readonly scope: RecipientScope;
  page(query: RecipientQuery, page: number, size: number): RecipientPage;
  matchingEligibleIds(query: RecipientQuery): string[];
}
export interface LookupOption { value: string; label: string; description?: string; disabled?: boolean }
export type LookupLoader = (query: string, signal: AbortSignal) => Promise<readonly LookupOption[]>;

/** Versioned browser-local demo documents, not send requests or authorization. */
export interface EmailContent { version: 1; html: string; plainText: string }
export interface EmailDraft { subject: string; category: string; sender: string; replyTo: string; content: EmailContent }
export interface EmailTemplate { id: string; name: string; category: string; subject: string; description: string; content: EmailContent; updatedAt: string; builtIn: boolean }
