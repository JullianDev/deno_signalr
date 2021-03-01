import { Evt, to } from "./deps.ts";
export { to };

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
     * @type {string | null | unknown}
     * @memberof SignalRError
     */
    message: string | null | unknown
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
    /**
     * The connection id
     * @type {string}
     * @memberof SignalRConnection
     */
    id?: string
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
     * Messaga arguments
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
     * Invocation ID
     * @type {number}
     * @memberof SignalRHubMessageData
     */
    I?: number,
    /**
     * Message error
     * @type {string}
     * @memberof SignalRHubMessageData
     */
    E?: string,
    /**
     * Message result
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
 * @extends Evt
 */
export class SignalR extends Evt<
    [ "connected", undefined ] |
    [ "disconnected", string ] |
    [ "reconnecting", number ] |
    [ "error", SignalRError ]> 
    {
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
    private _hubNames?: string[] | Record<string, unknown>[];
    /**
     * The inovcation ID
     * @public
     * @type {number}
     */
    public _invocationId = 0;
    /**
     * Call timeout in milliseconds
     * @private
     * @type {number}
     */
    public _callTimeout = 0;
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
    constructor(url: string, hubs: string[], query: Record<string, unknown> = {}, headers: Record<string, unknown> = {}) {
      super();
      this.url = url;
      this.connection = {
          state: SignalRConnectionState.disconnected,
          hub: new SignalRHub(this),
          lastMessageAt: new Date().getTime()
      };
      this._hubNames = hubs;
      this.query = query;
      this.headers = headers;
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
                if (this.connection && message.H) {
                    const hub = message.H;
                    const handler = this.connection.hub.handlers[hub];
                    if (handler && message.M) {
                        // @ts-ignore: Handlers should always be records unless modified code
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
   * @public
   * @param {string} hub - The message hub to send a message to 
   * @param {string} method = THe method to send with the data
   * @param {unknown} args - Args to send
   */
  public _sendMessage(hub: string, method: string, args: unknown): void {
      const payload = JSON.stringify({
         H: hub,
         M: method,
         A: args,
         I: this._invocationId 
      });
      this._invocationId++;
      if (this._websocket && (this._websocket.readyState === this._websocket.OPEN)) 
        this._websocket.send(payload);
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
      const url = `${this.url}/negotiate?${query.toString()}`;
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
   * Connect to the websocket
   * @private
   * @param {number} [protocol=1.5] - The SignalR client protocol
   */
  private _connect(protocol = 1.5): void {
      if (this.url && this.connection) {
          const url = this.url.replace(/^http/, "ws");
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(this.query)) query.append(key, String(value));
    
          query.set("connectionData", JSON.stringify(this._hubNames));
          query.set("clientProtocol", String(protocol));
          query.set("transport", "webSockets");
          query.set("connectionToken", String(this.connection.token));
          query.set("tid", "10");
          const webSocket = new WebSocket(`${url}/connect?${query.toString()}`);
          webSocket.onopen = (event: Event) => {
              this._invocationId = 0;
              this._callTimeout = 0;
              this._start().then(() => {
                  this._reconnectCount = 0;
                  this.post(["connected", undefined]);
                  if (this.connection) this.connection.state = SignalRConnectionState.connected;
                  this._markLastMessage();
                  if (this._keepAlive) this._beat();
              }).catch((error: SignalRError) => {
                if (this.connection) this.connection.state = SignalRConnectionState.disconnected;
                this._error(error.code, error.message);
              });
          }
          webSocket.onerror = (event: Event | ErrorEvent) => {
              if ("error" in event) this._error(SignalRErrorCode.socketError, event.error);
          }
          webSocket.onmessage = (message: SignalRHubMessage) => {
              this._receiveMessage(message);
          }
          webSocket.onclose = (event: CloseEvent) => {
            this._callTimeout = 1000;
            if (this.connection) this.connection.state = SignalRConnectionState.disconnected;
            this.post(["disconnected", "failed"]);
            this._reconnect();
          }
          this._websocket = webSocket;
      }
  }
  /**
   * Attempt a reconnection to the websocket
   * @private
   * @param {boolean} [restart=false] - Whether or not it should restart
   */
  private _reconnect(restart = false): void {
      if (this._reconnectTimer || (this.connection && this.connection.state === SignalRConnectionState.reconnecting)) return;
      this._clearBeatTimer();
      this._close();
      this._reconnectTimer = setTimeout(() => {
        this._reconnectCount++
        if (this.connection) this.connection.state = SignalRConnectionState.reconnecting;
        this.post(["reconnecting", this._reconnectCount]);
        restart ? this.start() : this._connect();
        this._reconnectTimer = undefined;
      }, this.reconnectDelayTime || 5000);
  }
  /**
   * Clear the current reconnect timer if it exists
   * @private
   */
  private _clearReconnectTimer(): void {
    if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = undefined;
    }
  }
  /**
   * Watch time elapsed since last message
   * @private
   */
  private _beat(): void {
      if (this.connection) {
        const timeElapsed = new Date().getTime() - this.connection.lastMessageAt;
        if (timeElapsed > this._keepAliveTimeout) {
            this.connection.state = SignalRConnectionState.disconnected;
            this._error(SignalRErrorCode.connectLost)
        } else {
            this._beatTimer = setTimeout(() => {
                this._beat()
            }, this._beatInterval);
        }
    }
  }
  private _clearBeatTimer(): void {
    if (this._beatTimer) {
      clearTimeout(this._beatTimer);
      this._beatTimer = undefined;
    }
  }
  /**
   * Mark the last message time as current time
   * @private
   */
  private _markLastMessage(): void {
    if (this.connection) this.connection.lastMessageAt = new Date().getTime();
  }
  /**
   * Start the SignalR connection
   * @private
   * @param {number} [protocol=1.5] - The SignalR client protocol
   * @returns {Promise<Record<string, unknown>>}
   */
  private _start(protocol = 1.5): Promise<unknown> {
      if (this.url && this.connection) {
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(this.query)) query.append(key, String(value));
          const headers = new Headers();
          for (const [key, value] of Object.entries(this.headers)) headers.append(key, String(value));

          query.set("connectionData", JSON.stringify(this._hubNames));
          query.set("clientProtocol", String(protocol));
          query.set("transport", "webSockets");
          query.set("connectionToken", String(this.connection.token));
          const url = `${this.url}/start?${query.toString()}`;
          return new Promise((resolve, reject) => {
            fetch(url, {
                method: "GET",
                headers: headers
            }).catch((error: Error) =>
                reject({ code: SignalRErrorCode.startError, message: error })
            ).then(async (data: Response | void) => {
                if (data) {
                    if (data.ok) {
                        resolve(await data.json())
                    } else if (data.status === 302 || data.status === 401 || data.status === 403) {
                        reject({ code: SignalRErrorCode.unauthorized, message: null });
                    } else {
                        reject({ code: SignalRErrorCode.startError, message: data.status })
                    }
                }
            });
          });
      } else throw new Error(`A connection has not yet been established.`);
  }
  /**
   * Abort the SignalR connection
   * @private
   * @param {number} [protocol=1.5] - The SignalR client protocol
   * @returns {Promise<Record<void>>}
   */
  private _abort(protocol = 1.5): Promise<void> {
    if (this.url && this.connection) {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(this.query)) query.append(key, String(value));
        const headers = new Headers();
        for (const [key, value] of Object.entries(this.headers)) headers.append(key, String(value));

        query.set("connectionData", JSON.stringify(this._hubNames));
        query.set("clientProtocol", String(protocol));
        query.set("transport", "webSockets");
        query.set("connectionToken", String(this.connection.token));
        const url = `${this.url}/abort?${query.toString()}`;
        return new Promise((resolve, reject) => {
          fetch(url, {
              method: "POST",
              headers: headers
          }).catch((error: Error) =>
              reject({ code: SignalRErrorCode.abortError, message: error })
          ).then((data: Response | void) => {
              if (data) {
                  if (data.ok) {
                      resolve()
                  } else if (data.status === 302 || data.status === 401 || data.status === 403) {
                      reject({ code: SignalRErrorCode.unauthorized, message: null });
                  } else {
                      reject({ code: SignalRErrorCode.abortError, message: data.status })
                  }
              }
          });
        });
    } else throw new Error(`A connection has not yet been established.`);
  }
  /**
   * Emit an error and attempt a reconnect
   * @param {SignalRErrorCode} code - SignalRError code to emit
   * @param {unknown?} extra = Extra data to emit
   */
  private _error(code: SignalRErrorCode, extra?: unknown): void {
      this.post(["error", { 
          code: code, 
          message: extra 
      }]);
      if (code === SignalRErrorCode.negotiateError || code === SignalRErrorCode.connectError) {
          this._reconnect(true);
      } else if (code === SignalRErrorCode.startError || code === SignalRErrorCode.connectLost) {
          this._reconnect();
      }
  }
  /**
   * Close the SignalR instance
   * @private
   */
  private _close(): void {
      if (this._websocket) {
        this._websocket.onclose = () => {};
        this._websocket.onmessage = () => {};
        this._websocket.onerror = () => {};
        this._websocket.close();
        this._websocket = undefined;
      }
  }
  /**
   * Start the SignalR hubs
   * @public
   * @param {number} [protocol=1.5] - The client protocol
   */
  public start(protocol = 1.5): void {
      if (!this._bound) {
          if (!this.url) return this._error(SignalRErrorCode.invalidURL);
          if (!(this.url.startsWith('http:') || this.url.startsWith('https:'))) return this._error(SignalRErrorCode.invalidProtocol);
          if (this._hubNames && this._hubNames.length) {
              const hubs = [];
              for (const hub of this._hubNames) hubs.push({ name: hub });
              this._hubNames = hubs;
          } else return this._error(SignalRErrorCode.noHub);
          this._bound = true;
      }
      this._negotiate(protocol).then((negotiateProtocol: Record<string, unknown>) => {
          if (this.connection && typeof(negotiateProtocol.ConnectionToken) === "string" && typeof(negotiateProtocol.ConnectionId) === "string") {
            this.connection.token = negotiateProtocol.ConnectionToken;
            this.connection.id = negotiateProtocol.ConnectionId;
          }
          if (negotiateProtocol.KeepAliveTimeout && typeof(negotiateProtocol.KeepAliveTimeout) === "number") {
            this._keepAlive = true
            this._keepAliveTimeout = negotiateProtocol.KeepAliveTimeout * 1000
            this._beatInterval = this._keepAliveTimeout / 4
          } else {
            this._keepAlive = false
          }
          this._connect(protocol);
      }).catch((error: Error) => {
          if (this.connection) this.connection.state = SignalRConnectionState.disconnected;
          // @ts-ignore: Promise only rejects as a Record<string, unknown>, but the type is an Error
          this._error(error.code, error.message);
      });
  }
}
/**
 * SignalR hub for connections
 */
export class SignalRHub {
    /**
     * SignalR client
     * @public
     * @type {SignalRHub?}
     */
    public client?: SignalR;
    /**
     * Hub handlers
     * @public
     * @type {Record<string, unknown>}
     */
    public handlers: Record<string, unknown> = {};
    /**
     * Hub callbacks
     * @public
     * @type {Record<string, unknown>}
     */
    public callbacks: Record<number, unknown> = {};
    /**
     * Construct a SignalR hub
     * @param {SignalR} client - The SignalR client for the hub to use
     */
    constructor(client: SignalR) {
        this.client = client;
    }
    /**
     * Handle a callback - public to allow access by Client
     * @private
     * @param {number} invocationId - The number of invocations
     */
    public _handleCallback(invocationId: number, error?: string, result?: string): void {
        const callback = this.callbacks[invocationId];
        if (callback && typeof(callback) === "function") callback(error, result);
    }
    /**
     * Bind events, receive messages
     * @param {string} hub - The SignalR hub
     * @param {string} method - The method
     * @param {function} callback - Callback function
     */
    public on(hub: string, method: string, callback: (error?: string, result?: string) => unknown): void {
        let handler: Record<string, unknown> | unknown = this.handlers[hub];
        if (!handler) handler = (this.handlers[hub] = {});
        // @ts-ignore: Handler was defined above
        handler[method] = callback;
    }
    /**
     * Process invocation arguments
     * @private
     * @param args - The invocation args
     * @returns {Array<unknown>}
     */
    private _processInvocationArgs(args: IArguments): unknown[] {
        const messages = [];
        if (args.length > 2) {
            for (let i = 2; i < args.length; i++) {
                const arg = args[i];
                messages[i - 2] =  (typeof arg === "function" || typeof arg === "undefined") ? null : arg;
            }
        }
        return messages;
    }
    /**
     * Call with argumenets
     * @param {string} hub - The SignalR hub
     * @param {string} method - The SiggnalR hub method
     */
    public call(hub: string, method: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.client) return reject();
            const messages = this._processInvocationArgs(arguments);
            const invocationId = this.client._invocationId;
            const timeoutTimer = setTimeout(() => {
                delete this.callbacks[invocationId];
                return reject("Timeout");
            }, this.client._callTimeout || this.client.callTimeout || 5000);
            this.callbacks[invocationId] = (error: string, result: string) => {
                clearTimeout(timeoutTimer);
                delete this.callbacks[invocationId];
                return error ? reject(error) : resolve(result);
            };
            this.client._sendMessage(hub, method, messages);
        })
    }
    public invoke(hub: string, method: string) {
        const messages = this._processInvocationArgs(arguments);
        if (this.client) this.client._sendMessage(hub, method, messages);
    }
}