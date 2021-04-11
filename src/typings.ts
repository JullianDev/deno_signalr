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
    disconnected = 4
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
    abortError = "Abort error"
}
/**
 * SignalR error with Code and Message properties
 * @interface StandardError
 */
export interface StandardError {
    /**
     * Error code
     * @memberof StandardError
     */
    code: ErrorCode,
    /**
     * Error message
     * @memberof StandardError
     */
    message: string | null | unknown
}
/**
 * SignalR connection
 * @interface Connection
 */
export interface Connection {
    /**
     * The connection state
     * @memberof Connection
     */
    state: ConnectionState,
    /**
     * The assigned hub's name
     * @memberof Connection
     */
    hub: Hub,
    /**
     * The date of the last message in milliseconds
     * @memberof Connection
     */
    lastMessageAt: number,
    /**
     * The connection token from negotiation
     * @memberof Connection
     */
    token?: string,
    /**
     * The connection id
     * @memberof Connection
     */
    id?: string
}
/**
 * SignalR message
 * @interface Message
 */
export interface Message {
    /**
     * The hub name
     * @memberof Message
     */
    H?: string,
    /**
     * The hub method
     * @memberof Message
     */
    M?: string,
    /**
     * The message's arguments
     * @memberof Message
     */
    A?: unknown
}
/**
 * Message data from a connection
 * @interface HubMessageData
 */
export interface HubMessageData {
    /**
     * Array of SignalRMessages
     * @memberof HubMessageData
     */
    M?: Message[],
    /**
     * Invocation ID
     * @memberof HubMessageData
     */
    I?: number,
    /**
     * Message error
     * @memberof HubMessageData
     */
    E?: string,
    /**
     * Whether or not it was successful
     * @memberof HubMessageData
     */
    R?: boolean
}
/**
 * Message from a SignalR hub
 * @interface HubMessage
 */
export interface HubMessage {
    /**
     * The message type
     * @memberof HubMessage
     */
    type: string,
    /**
     * The data sent
     * @memberof HubMessage
     */
    data: string
}
export interface ClientOptions {
    /**
     * The queries to add to the URL
     */
    queries?: Record<string, unknown>,
    /**
     * The headers for all requests
     */
    headers?: Record<string, string>,
    /**
     * The timeout for calls in milliseconds
     */
    callTimeout?: number,
    /**
     * The delay time for reconnecting in milliseconds
     */
    reconnectDelayTime?: number
}