import { logger } from "./src/utilities/logger.ts"

/*
    Requires the --unstable flag to actually function
    will error even before compilation if stable
*/
const netPermission: Deno.PermissionStatus = await Deno.permissions.query({ name: "net" } as const);
if (netPermission.state !== "granted") 
    throw logger.error("This library requires the '--allow-net' flag to function.");
export { BaseClient, Client } from "./src/client.ts";
export * as services from "./src/services/index.ts"
export * as enum from "./src/enum.ts";