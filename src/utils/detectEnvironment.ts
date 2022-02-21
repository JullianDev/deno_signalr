type EnvironmentType = "NodeJS" | "Deno" | "Unknown" | "Browser";

/**
 * Detect the current environment.
 */
export function detectEnvironment(): EnvironmentType {
  if (
      // @ts-ignore: Ignore these parts in TypeScript
    "process" in globalThis && process.release.name.search(/node|io.js/) !== -1
  ) {
    return "NodeJS";
  }
  // @ts-ignore: Ignore these parts in TypeScript
  if ("Deno" in globalThis) return "Deno";
  // @ts-ignore: Ignore these parts in TypeScript
  if ("document" in globalThis) return "Browser";

  return "Unknown";
}
