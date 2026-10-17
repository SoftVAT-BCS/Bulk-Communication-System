import { Workspace } from "../../src/workspace";
export default function Page() { return <Workspace authenticated={process.env.BCS_APPLICATION_MODE === "authenticated"} page="Configuration" />; }
