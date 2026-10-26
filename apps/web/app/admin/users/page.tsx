import { AppShell } from "@bcs/ui";
import { SessionGate } from "../../../src/session-gate";
import { BcsUserCreation } from "../../../src/bcs-user-creation";
import { TenantAdministration } from "../../../src/saas-console";
export default function UserDirectoryPage() {return <AppShell page="User Creation" mode="authenticated"><SessionGate><div className="heading-row"><div><div className="eyebrow">ADMINISTRATION / IDENTITY</div><h1>User creation & onboarding</h1><p className="subtitle">Invite approved users and review your company directory.</p></div></div><BcsUserCreation/><TenantAdministration/></SessionGate></AppShell>;}
