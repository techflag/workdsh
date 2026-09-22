import type { Context } from "@deepseek-ai/cordis";
import { ContentService } from "./content/service.js";
import * as Tools from "./content/tools.js";
import * as Connection from "./content/connection.js";
import { registerOfficeAssets } from "./runtime-route.js";
export const name = "workdsh-office";
// The Loader entry must declare the services its child modules consume, too.
export const inject = [
  "fs",
  "storageDomain",
  "tools",
  "systemPrompt",
  "connection",
  "workdshIdentity",
  "workdshAccess",
  "workdshAudit",
];
export interface Config {
  tools?: boolean;
}
export async function apply(ctx: Context, config: Config = {}) {
  // The lazy editor artifacts are served over the optional Web carrier; a
  // composition without one simply never opens the route.
  registerOfficeAssets(ctx);
  await ctx.plugin(ContentService);
  await ctx.plugin(Connection);
  if (config.tools !== false) await ctx.plugin(Tools);
}
