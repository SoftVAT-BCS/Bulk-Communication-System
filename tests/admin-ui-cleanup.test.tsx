import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@bcs/ui";
import { SessionGate } from "../apps/web/src/session-gate";
import { BcsUserCreation } from "../apps/web/src/bcs-user-creation";

afterEach(() => vi.unstubAllGlobals());

describe("BCS administration cleanup", () => {
  it("renders the signed-in workspace without another Sign out action", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { name: "Workspace Owner", permissions: ["dashboard.view"], home: "/" } }), {
      status: 200, headers: { "content-type": "application/json" },
    })));
    render(<AppShell mode="authenticated" page="Dashboard"><SessionGate><p>Dashboard ready</p></SessionGate></AppShell>);
    expect(await screen.findByText("Dashboard ready")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Log Out" })).toHaveLength(1);
    expect(screen.queryByText(/Signed in as Workspace Owner/)).toBeNull();
  });

  it("reports the real invitation setup gate without claiming an API endpoint is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("configuration?kind=rights")) return new Response(JSON.stringify({
        data: { principals: [{ id: "principal-1", display_name: "Workspace Owner", status: "active" }],
          roles: [], portals: [] },
      }), { status: 200, headers: { "content-type": "application/json" } });
      if (url.endsWith("/api/bcs/app/users?view=directory")) return new Response(JSON.stringify({ data: { users: [], selfId: "principal-1", managementEnabled: false } }), { status: 200, headers: { "content-type": "application/json" } });
      if (url.endsWith("/api/bcs/app/users")) return new Response(JSON.stringify({
        data: { invitationEnabled: false, setupRequired: "MIGRATION" },
      }), { status: 200, headers: { "content-type": "application/json" } });
      return new Response("not found", { status: 404 });
    }));
    render(<BcsUserCreation />);
    expect(await screen.findByText(/Apply the approved restricted onboarding migration 020/)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: /^Invite user/ }).hasAttribute("disabled")).toBe(true));
    expect(screen.queryByText(/has no authorized provisioning endpoint/)).toBeNull();
  });
});
