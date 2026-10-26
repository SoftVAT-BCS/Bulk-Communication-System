import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@bcs/ui";

beforeEach(() => { localStorage.removeItem("bcs-sidebar-collapsed"); });
afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem("bcs-sidebar-collapsed"); });

describe("BCS administration navigation", () => {
  it("keeps five workspace links and exposes administration routes separately", () => {
    render(<AppShell page="User Rights" mode="authenticated"><p>Authenticated area</p></AppShell>);
    expect(within(screen.getByRole("navigation", { name: "Main workspace" })).getAllByRole("link")).toHaveLength(5);
    const admin = screen.getByRole("navigation", { name: "Administration" });
    expect(within(admin).getAllByRole("link").map(item => item.getAttribute("href"))).toEqual([
      "/admin/users", "/admin/rights",
    ]);
    expect(within(admin).getByRole("link", { name: "User Rights" }).getAttribute("aria-current")).toBe("page");
    expect(within(admin).queryByRole("link", { name: "Database Connections" })).toBeNull();
    expect(screen.getByRole("button", { name: "Log Out" })).toBeTruthy();
  });

  it("persists desktop menu collapse and expansion as a UI preference", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppShell page="User Creation" mode="authenticated"><p>Content</p></AppShell>);
    await user.click(screen.getByRole("button", { name: "Minimize main menu" }));
    expect(container.querySelector(".bcs-sidebar-collapsed")).not.toBeNull();
    expect(localStorage.getItem("bcs-sidebar-collapsed")).toBe("1");
    await user.click(screen.getByRole("button", { name: "Expand main menu" }));
    expect(container.querySelector(".bcs-sidebar-collapsed")).toBeNull();
    expect(localStorage.getItem("bcs-sidebar-collapsed")).toBe("0");
  });

  it("never shows a live Log Out action in synthetic-only mode", () => {
    render(<AppShell page="Dashboard"><p>Demo</p></AppShell>);
    expect(screen.queryByRole("navigation", { name: "Administration" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Log Out" })).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it("reports a failed sign-out without claiming the session ended", async () => {
    const user = userEvent.setup();
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify({ error: { code: "UNAVAILABLE" } }), { status: 503 }));
    vi.stubGlobal("fetch", fakeFetch);
    render(<AppShell page="User Rights" mode="authenticated"><p>Demo</p></AppShell>);
    await user.click(screen.getByRole("button", { name: "Log Out" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Sign out failed. Please try again.");
    expect(fakeFetch).toHaveBeenCalledWith("/api/bcs/app/session", expect.objectContaining({ method: "DELETE", credentials: "same-origin" }));
  });
});
