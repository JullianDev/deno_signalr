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
 * SignalR error codes
 */
export enum SignalRErrorCode {
    /**
     * Invalid URL
     */
    invalidURL = "Invalid URL",
    /**
     * Invalid protocol
     */
    invalidProtocol = "Invalid protocol",
    /**
     * No SignalR hub
     */
    noHub = "No hub",
    /**
     * Webosckets are not suppprted by server
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
     * Error during startup
     */
    startError = "Start error",
    /**
     * Error during connection
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
 * SignalR error
 * @interface SignalRError
 */
export interface SignalRError {
    /**
     * SignalR error code
     * @type {SignalRErrorCode}
     * @memberof SignalRError
     */
    code: SignalRErrorCode,
    /**
     * SignalR error message
     * @type {string | null}
     * @memberof SignalRError
     */
    message: string | null
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
    lastMessageAt: number,
    /**
     * The connection token
     * @type {string}
     * @memberof SignalRConnection
     */
    token?: string,
}
/**
 * SignalR message
 * @interface SignalRMessage
 */
export interface SignalRMessage {
    /**
     * The assigned hub
     * @type {string?}
     * @memberof SignalRMessage
     */
    H?: string,
    /**
     * Message method
     * @type {string?}
     * @memberof SignalRMessage
     */
    M?: string,
    /**
     * 
     * @type {string?}
     * @memberof SignalRMessage
     */
    A?: string
}
/**
 * Message data from a SignalR hub
 * @interface SignalRHubMessageData
 */
export interface SignalRHubMessageData {
    /**
     * Array of SignalRMessages
     * @type {SignalRHubMessage[]?}
     * @memberof SignalRHubMessageData
     */
    M?: SignalRMessage[],
    /**
     * 
     * @type {string}
     * @memberof SignalRHubMessageData
     */
    I?: string,
    /**
     * 
     * @type {string}
     * @memberof SignalRHubMessageData
     */
    E?: string,
    /**
     * 
     * @type {string}
     * @memberof SignalRHubMessageData
     */
    R?: string
}
/**
 * Message from a SignalR hub
 * @interface SignalRHubMessage
 */
export interface SignalRHubMessage {
    /**
     * The message type
     * @type {string}
     * @memberof SignalRHubMessage
     */
    type: string,
    /**
     * The data sent
     * @type {string}
     * @memberof SignalRHubMessage
     */
    data: string
}
/**
 * A SignalR client for Deno which supports ASP.net
 */
export class SignalR {
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
     * @type {WebSocket}
     */
    private _websocket?: WebSocket;
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
  /**
   * Mark the last message time as current time
   * @private
   */
  private _markLastMessage(): void {
      if (this.connection) this.connection.lastMessageAt = new Date().getTime();
  }
  /**
   * Proccess a message
   * @private
   * @param {SignalRHubMessage} message - The SignalR hub message
   */
  private _receiveMessage(message: SignalRHubMessage): void {
    this._markLastMessage();
    if (message.type === "message" && message.data !== "{}") {
        const data: SignalRHubMessageData = JSON.parse(message.data);
        if (data.M) {
            data.M.forEach((message: SignalRMessage) => {
                if (this.connection) {
                    const hub = message.H;
                    const handler = this.connection.hub.handlers[hub];
                    if (handler) {
                        const method = handler[message.M];
                        if (method) method.apply(this, message.A);
                    }
                }
            }) 
        } else if (data.I) {
            if (this.connection) this.connection.hub._handleCallback(data.I, data.E, data.R)
        }
    }
  }
  /**
   * Send a message to a hub
   * @private
   * @param {string} hub - The message hub to send a message to 
   * @param {string} method = THe method to send with the data
   * @param {unknown} args - Args to send
   */
  private _sendMessage(hub: string, method: string, args: unknown): void {
      const payload = JSON.stringify({
         H: hub,
         M: method,
         A: args,
         I: this._invocationId 
      });
      this._invocationId++;
      if (this._websocket && (this._websocket.readyState === this._websocket.OPEN)) 
        this._websocket.send(payload, (error: Error) =>
            console.log(error)
        )
  }
  /**
   * Negotitate with the endpoint for a connection token
   * @private
   * @param {number} [protocol=1.5]
   * @returns {Promise<Record<string, unknown>>}
   */
  private _negotiate(protocol = 1.5): Promise<Record<string, unknown>> {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(this.query)) query.append(key, String(value));
      const headers = new Headers();
      for (const [key, value] of Object.entries(this.headers)) headers.append(key, String(value));

      query.set("connectionData", JSON.stringify(this._hubNames));
      query.set("clientProtocol", String(protocol));
      const url = `${this.url}?${query.toString()}`;
      return new Promise((resolve, reject) => {
        fetch(url, {
            method: "GET",
            headers: headers
        }).catch((error: Error) =>
            reject({ code: SignalRErrorCode.negotiateError, message: error })
        ).then(async (data: Response | void) => {
            if (data) {
                if (data.ok) {
                    const negotiateProtocol = await data.json();
                    if (!negotiateProtocol.TryWebSockets) return reject({ code: SignalRErrorCode.unsupportedWebsocket, message: null });
                    resolve(negotiateProtocol);
                } else if (data.status === 302 || data.status === 401 || data.status === 403) {
                    reject({ code: SignalRErrorCode.unauthorized, message: null });
                } else {
                    reject({ code: SignalRErrorCode.negotiateError, message: data.status })
                }
            }
        });
      });
  }
  /**
   * 
   * @param {number} [protocol=1.5] - The SignalR client protocol
   */
  private _connect(protocol = 1.5) {
      if (this.url && this.connection) {
          const url = this.url.replace(/^http/, "ws");
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(this.query)) query.append(key, String(value));
          const headers = new Headers();
          for (const [key, value] of Object.entries(this.headers)) headers.append(key, String(value));
    
          query.set("connectionData", JSON.stringify(this._hubNames));
          query.set("clientProtocol", String(protocol));
          query.set("transport", "webSockets");
          query.set("connectionToken", String(this.connection.token));
          query.set("tid", "10");
          const webSocket = new WebSocket(`${url}/connect?${query}`);
      }
  }
}
/* TODO, this is for deno eslint to shut up */
export class SignalRHub {
    constructor(...params: Array<unknown>) {
        /* TODO */
    }
}