import WS from "../custom_socket/ws.ts";
import { detectEnvironment } from "./detectEnvironment.ts";

/**
 * Custom websocket options. Made to match with Node WS.
 */
export interface WSOptions {
  headers: Record<string, string>;
}

/**
 * Creates a websocket connection with custom headers!
 *
 * @param url URL where the socket needs to be connected
 * @param options Extra options to send
 * @example
 * const ws = createSocketConnection('url', {
 *     headers: {
 *        Authorization: 'Bearer token'
 *     }
 * })
 */

export function createSocketConnection(
  url: string,
  options: WSOptions,
): WS | WebSocket {
  const environment = detectEnvironment();
  if (environment === "Browser" || environment === "Unknown") return new WebSocket(url);
  // Shim this on Node
  return new WS(url, options);
}
