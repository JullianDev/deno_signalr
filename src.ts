import { WebSocket as WebSocketClient } from "./deps.ts";

/**
 * SignalR connection state
 */
export enum SignalRConnectionState {
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
 * SignalR connection
 * @interface SignalRConnection
 */
export interface SignalRConnection {
    /**
     * The connection state of the connection
     * @type {SignalRConnectionState}
     * @memberof SignalRConnection
     */
    state: SignalRConnectionState,
    /**
     * The assigned hub
     * @type {SignalRHub}
     * @memberof SignalRConnection
     */
    hub: SignalRHub,
    /**
     * The date of the last message in milliseconds from 0
     * @type {number}
     * @memberof SignalRConnection
     */
    lastMessageAt: number
}
/**
 * A SignalR client for Deno which supports ASP.net
 * Based on node-signalr https://github.com/alex8088/node-signalr
 */
class SignalR {
    /**
     * The URL to connect to
     * @type {string?}
     * @public
     */
    public url?: string;
    /**
     * The queries to add to the URL
     * @public
     * @type {url}
     */
    public query: Record<string, unknown> = {};
    /**
     * The headers for the reuquest
     * @public
     * @readonly
     * @type {Record<string, unknown>}
     */
    public headers: Record<string,  unknown> = {};
    /**
     * The delay time for reconnecting in milliseconds
     * @public
     * @type {number}
     */
    public reconnectDelayTime = 5000;
    /**
     * The timeout for requests in millisecods
     * @public
     * @type {number}
     */
    public requestTimeout = 5000;
    /**
     * The timeout for calls in milliseconds
     * @public
     * @type {number}
     */
    public callTimeout = 5000;
    /**
     * The call timeout
     * @public
     * @type {SignalRConnection?}
     */
    public connection?: SignalRConnection;
    /**
     * Whether or not it's bound
     * @private
     * @type {boolean}
     */
    private _bound = false;
    /**
     * The websocket connection
     * @private
     * @type {WebSocketClient}
     */
    private _websocket?: WebSocketClient;
    /**
     * The hub names to connect to
     * @private
     * @type {string[]?}
     */
    private _hubNames?: string[];
    /**
     * The inovcation ID
     * @private
     * @type {number}
     */
    private _invocationId = 0;
    /**
     * Call timeout in milliseconds
     * @private
     * @type {number}
     */
    private _callTimeout = 0;
    /**
     * The timtout to keep alive in milliseconds
     * @private
     * @type {number]
     */
    private _keepAliveTimeout = 5000;
    /**
     * Whether or not to keep the connection alive
     * @private
     * @type {boolean}
     */
    private _keepAlive = true;
    /**
     * Interval to beat in milliseconds
     * @private
     * @type {number}
     */
    private _beatInterval = 5000;
    /**
     * setInterval instance to beat
     * @private
     * @type {number}
     */
    private _beatTimer?: number;
    /**
     * Amount of times to attempt reconnect
     * @private
     * @type {number}
     */
    private _reconnectCount = 0;
    /**
     * setTimeout instance for reconnection
     */
    private _reconnectTimer?: number;
    /**
     * @constructor
     * @param {string} url - URL to connect to
     * @param {string[]} hubs - Hubs to connect to
     */
    constructor(url: string, hubs: string[]) {
      this.url = url;
      this.connection = {
          state: SignalRConnectionState.disconnected,
          hub: new SignalRHub(this),
          lastMessageAt: new Date().getTime()
      };
      this._hubNames = hubs;
  }
}

/* TODO, this is for deno eslint to shut up */
class SignalRHub {
    constructor(...params: Array<unknown>) {
        /* TODO */
    }
}