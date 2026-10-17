import { Workspace } from "../../src/workspace";
export const dynamic = "force-dynamic";
export default function Page() { return <Workspace page="Communication" database={Boolean(process.env.BCS_DATA_MODE && process.env.BCS_DATA_MODE !== "synthetic")} />; }
