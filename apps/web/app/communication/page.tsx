import { Workspace } from "../../src/workspace";
export const dynamic = "force-dynamic";
export default function Page() { return <Workspace authenticated={process.env.BCS_APPLICATION_MODE === "authenticated"} page="Communication" database={Boolean(process.env.BCS_DATA_MODE && process.env.BCS_DATA_MODE !== "synthetic")} />; }
