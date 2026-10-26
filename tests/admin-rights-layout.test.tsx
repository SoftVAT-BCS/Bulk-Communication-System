import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BcsUserRights } from "../apps/web/src/bcs-user-rights";

const fixture = {
  principal: "owner-001",
  principals: [{ id: "owner-001", display_name: "Workspace Owner", status: "active" }],
  portals: [{ id: "portal-001", portal_name: "SkillMonk Academy" }],
  roles: [{ id: "role-operator", role_code: "operator", role_name: "BCS Operator", is_builtin: false }],
  permissions: [
    { permission_code: "dashboard.view", description: "View dashboard" },
    { permission_code: "recipients.export", description: "Export recipients" },
    { permission_code: "access.manage", description: "Manage user access" },
  ],
  grants: [{ role_id: "role-operator", permission_code: "dashboard.view" }],
  assignments: [], scopes: [],
};
afterEach(() => vi.unstubAllGlobals());

describe("permission matrix fidelity", () => {
  it("displays each backend action on a separate row and supports both layouts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: fixture }), { status: 200, headers: { "content-type": "application/json" } })));
    const user = userEvent.setup();
    render(<BcsUserRights />);
    const region = await screen.findByRole("region", { name: "Permissions matrix" });
    await waitFor(() => expect(within(region).getAllByRole("switch")).toHaveLength(3));
    expect(within(region).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(region).getByText("dashboard.view")).toBeTruthy();
    expect(within(region).getByText("access.manage")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Compact list" }));
    expect(within(region).getAllByRole("columnheader")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Matrix" }));
    expect(within(region).getAllByRole("columnheader")).toHaveLength(7);
  });
});
