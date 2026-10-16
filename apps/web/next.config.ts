import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@bcs/ui", "@bcs/contracts"], poweredByHeader: false, agentRules: false };
export default config;
