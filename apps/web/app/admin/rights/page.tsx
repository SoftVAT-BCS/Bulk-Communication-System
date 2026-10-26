import { AppShell } from "@bcs/ui";
import { SessionGate } from "../../../src/session-gate";
import { BcsUserRights } from "../../../src/bcs-user-rights";
export default function UserRightsPage(){return <AppShell page="User Rights" mode="authenticated"><SessionGate><div className="heading-row"><div><div className="eyebrow">ADMINISTRATION / ACCESS</div><h1>User rights & assignments</h1><p className="subtitle">Company and portal-scoped permissions, roles and access matrix.</p></div></div><BcsUserRights/></SessionGate></AppShell>;}
