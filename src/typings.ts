import { Hub } from "./classes/Hub.ts";
/**
 * SignalR connection state
 */
export enum ConnectionState {
  /**
   * Connected state
   */
  connected = 1,
  /**
   * Reconnecting state
   */
  reconnecting = 2,
  /**
   * Disconnected state
   */
  disconnected = 4,
}
/**
 * SignalR error codes
 */
export enum ErrorCode {
  /**
   * Invalid URL
   */
  invalidURL = "Invalid URL",
  /**
   * Invalid protocol
   */
  invalidProtocol = "Invalid protocol",
  /**
   * No hub
   */
  noHub = "No hub",
  /**
   * Webosckets are not suppprted by the webserver
   */
  unsupportedWebsocket = "Websockets is not supported",
  /**
   * Unauthorized for the resource
   */
  unauthorized = "Unauthorized",
  /**
   * Lost connection
   */
  connectLost = "Connect lost",
  /**
   * Negotiation error
   */
  negotiateError = "Negotiate error",
  /**
   * Start error
   */
  startError = "Start error",
  /**
   * Connection error
   */
  connectError = "Connect error",
  /**
   * WebSocket error
   */
  socketError = "Socket error",
  /**
   * Connection was aborted
   */
  abortError = "Abort error",
}
/**
 * SignalR error with Code and Message properties
 */
export interface StandardError {
  /**
   * Error code
   */
  code: ErrorCode;
  /**
   * Error message
   */
  message: string | null | unknown;
}
/**
 * SignalR connection
 */
export interface Connection {
  /**
   * The connection state
   */
  state: ConnectionState;
  /**
     * The assigned hub's name
     * @memberof Connection
     */
  hub: Hub;
  /**
   * The date of the last message in milliseconds
   */
  lastMessageAt: number;
  /**
   * The connection token from negotiation
   */
  token?: string;
  /**
   * The connection id
   */
  id?: string;
}
/**
 * SignalR message
 */
export interface Message {
  /**
   * The hub name
   */
  H?: string;
  /**
   * The hub method
   */
  M?: string;
  /**
   * The message's arguments
   */
  A?: unknown;
}
/**
 * Message data from a connection
 */
export interface HubMessageData {
  /**
   * Array of SignalRMessages
   */
  M?: Message[];
  /**
   * Invocation ID
   */
  I?: number;
  /**
   * Message error
   */
  E?: string;
  /**
   * Whether or not it was successful
   */
  R?: boolean;
}
/**
 * Message from a SignalR hub
 */
export interface HubMessage {
  /**
   *  The message type
   */
  type: string;
  /**
   * The message data
   */
  data: string;
}
export interface ClientOptions {
  /**
   * The query to add to the URL
   */
  query?: Record<string, string>;
  /**
   * The headers for all requests
   */
  headers?: Record<string, string>;
  /**
   * The timeout for calls in milliseconds
   */
  callTimeout?: number;
  /**
   * The delay time for reconnecting in milliseconds
   */
  reconnectDelayTime?: number;
}
