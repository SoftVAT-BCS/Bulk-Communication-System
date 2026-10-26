import { AppShell } from "@bcs/ui";
import { SessionGate } from "../../../src/session-gate";
import { BcsPortalDatabase } from "../../../src/bcs-portal-database";
export default function ConnectionSettingsPage(){return <AppShell page="Database Connections" mode="authenticated"><SessionGate><div className="heading-row"><div><div className="eyebrow">ADMINISTRATION / CONFIGURATION</div><h1>Portal & database connections</h1><p className="subtitle">Choose MySQL, SQL Server, PostgreSQL or approved REST API integration.</p></div></div><BcsPortalDatabase/></SessionGate></AppShell>;}
