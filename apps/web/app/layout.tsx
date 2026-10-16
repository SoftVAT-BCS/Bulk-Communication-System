import type { ReactNode } from "react";
import "@bcs/ui/styles.css";
export const metadata = { title: "Universal Notify · Synthetic UI", description: "BCS Step 3A UI foundation. No live messages or data connections." };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
