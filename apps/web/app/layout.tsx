import type { ReactNode } from "react";
import "@bcs/ui/styles.css";
import "../src/bcs-admin-pages.css";
export const metadata = { title: "Universal Notify", description: "SoftVAT BCS · Communication workspace" };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
