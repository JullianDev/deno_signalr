import { Evt, to } from "../../deps.ts";
import { createSocketConnection } from "../custom_socket/mod.ts";
import { Hub } from "./Hub.ts";
import type WS from "../custom_socket/ws.ts";

/**
 * SignalR connection state.
 */
export enum ConnectionState {
  connected = 1,
  reconnecting = 2,
  disconnected = 4,
}

/**
 * SignalR error codes enum.
 */
export enum ErrorCode {
  invalidURL = "Invalid URL",
  invalidProtocol = "Invalid protocol",
  noHub = "No hub",
  unsupportedWebsocket = "Websockets is not supported",
  unauthorized = "Unauthorized",
  connectLost = "Connection lost",
  negotiateError = "Negotiate error",
  startError = "Start error",
  connectError = "Connect error",
  socketError = "Socket error",
  abortError = "Abort error",
}

/**
 * SignalR error with Code and Message properties.
 */
export interface StandardError {
  /**
   * Error code.
   */
  code: ErrorCode;
  /**
   * Error message.
   */
  message: string | null | unknown;
}

/**
 * SignalR connection information.
 */
export interface Connection {
  /**
   * The connection state
   */
  state: ConnectionState;
  /**
   * The connection hub.
   */
  hub: Hub;
  /**
   * The date of the last message in milliseconds.
   */
  lastMessageAt: number;
  /**
   * The connection token from negotiation.
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
   * The hub name.
   */
  H?: string;
  /**
   * The message method.
   */
  M?: string;
  /**
   * The message's arguments.
   */
  A?: unknown;
}

/**
 * Message data from a SignalR connection.
 */
export interface HubMessageData {
  /**
   * Array of SignalRMessages sent.
   */
  M?: Message[];
  /**
   * Invocation ID of the message.
   */
  I?: number;
  /**
   * Message error type.
   */
  E?: string;
  /**
   * The result, whether it was successful.
   */
  R?: boolean;
}

/**
 * Hub Message from the server.
 */
export interface HubMessage {
  /**
   * The message type.
   */
  type: string;
  /**
   * The data sent.
   */
  data: string;
}

/**
 * The client options to include as additional options.
 */
export interface ClientOptions {
  /**
   * The query parameters to add to the URL for all requests.
   */
  query?: Record<string, string>;
  /**
   * The headers for all requests.
   */
  headers?: Record<string, string>;
  /**
   * The timeout for calls in milliseconds.
   */
  callTimeout?: number;
  /**
   * The delay time for reconnecting to the socket in milliseconds.
   */
  reconnectDelayTime?: number;
}

/**
 * A SignalR client for Deno which supports ASP.net
 * @extends {Evt<[ "connected", undefined ] | [ "disconnected", string ] | [ "reconnecting", number ] | [ "error", StandardError ]>}
 */
export class Client extends Evt<
  | ["connected", undefined]
  | ["disconnected", string]
  | ["reconnecting", number]
  | ["error", StandardError]
> {
  /**
   * The base URL of the client.
   */
  public url: string;

  /**
   * The query parameters to add to the URL for all requests.
   */
  public query: Record<string, string> = {};

  /**
   * The headers for all requests.
   */
  public headers: Record<string, string> = {};

  /**
   * The delay time for reconnecting to the socket in milliseconds.
   */
  public reconnectDelayTime = 5000;

  /**
   * The timeout for calls in milliseconds.
   */
  public callTimeout = 5000;

  /**
   * The SignalR connection.
   */
  public connection: Connection;

  /**
   * Whether it has ever been initialized.
   */
  public _bound = false;

  /**
   * The websocket connection
   */
  public _websocket?: WS | WebSocket;

  /**
   * The hub(s) to connect to.
   */
  public _hubNames: string[] | unknown[];

  /**
   * The latest invocation ID.
   */
  public _invocationId = 0;

  /**
   * Call timeout in milliseconds.
   */
  public _callTimeout = 0;

  /**
   * The timeout to keep alive in milliseconds.
   */
  public _keepAliveTimeout = 5000;

  /**
   * Whether to keep the connection alive.
   */
  public _keepAlive = true;

  /**
   * Heartbeat interval in milliseconds.
   */
  public _beatInterval = 5000;

  /**
   * The setInterval instance ID for the heartbeat.
   */
  public _beatTimer?: number;

  /**
   * Amount of times to attempt a reconnect before giving up.
   */
  public _reconnectCount = 0;

  /**
   * setTimeout instance ID for reconnection.
   */
  public _reconnectTimer?: number;

  /**
   * Construct a new SignalR Client.
   * @param url - URL to connect to.
   * @param hubs - Hubs to connect to.
   * @param options - Other client options.
   */
  constructor(url: string, hubs: string[], options?: ClientOptions) {
    super();
    this.url = url;
    this.connection = {
      state: ConnectionState.disconnected,
      hub: new Hub(this),
      lastMessageAt: Date.now(),
    };
    this._hubNames = hubs;
    if (options) {
      if (options.query) this.query = options.query;
      if (options.headers) this.headers = options.headers;
      if (options.callTimeout) this.callTimeout = options.callTimeout;
      if (options.reconnectDelayTime) {
        this.reconnectDelayTime = options.reconnectDelayTime;
      }
    }
  }

  /**
   * Process a SignalR message received from server.
   * @param message - The SignalR hub message.
   */
  public _receiveMessage(message: MessageEvent): void {
    this._markLastMessage();
    if (message.type === "message" && message.data !== "{}") {
      const data: HubMessageData = JSON.parse(message.data);
      if (data.M) {
        for (const message of data.M) {
          if (this.connection && message.H) {
            const hub = message.H;
            const handler = this.connection.hub.handlers[hub];
            if (handler && message.M) {
              // @ts-ignore: Handlers should always be records unless modified code
              const method = handler[message.M];
              if (method) method.call(this, message.A);
            }
          }
        }
      } else if (data.I) {
        if (this.connection) {
          this.connection.hub._handleCallback(data.I, data.E, data.R);
        }
      }
    }
  }

  /**
   * Send a Hub message to the server.
   * @param hub - The message hub to send a message to.
   * @param method = THe method to send with the data.
   * @param args - Arguments to send.
   */
  public _sendMessage(hub: string, method: string, args: unknown): void {
    const payload = JSON.stringify({
      H: hub,
      M: method,
      A: args,
      I: this._invocationId,
    });
    this._invocationId++;
    if (this._websocket && (this._websocket.readyState === WebSocket.OPEN)) {
      this._websocket.send(payload);
    }
  }

  /**
   * Negotiate with the endpoint for a connection token.
   * @param protocol - The SignalR protocol version.
   */
  public async _negotiate(protocol = 1.5): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      ...this.query,
      connectionData: JSON.stringify(this._hubNames),
      clientProtocol: String(protocol),
    });
    const headers = new Headers(this.headers);

    const url = new URL(`${this.url}/negotiate`);
    url.search = query.toString();
    let data: Response;

    try {
      data = await fetch(url.toString(), {
        headers,
      });
    } catch (err) {
      throw err;
    }

    if (data.ok) {
      const negotiateProtocol = await data.json();
      if (!negotiateProtocol.TryWebSockets) {
        throw { code: ErrorCode.unsupportedWebsocket, message: null };
      }

      return negotiateProtocol;
    } else if (
      data.status === 302 || data.status === 401 || data.status === 403
    ) {
      throw { code: ErrorCode.unauthorized, message: null };
    } else {
      throw { code: ErrorCode.negotiateError, message: data.status };
    }
  }

  /**
   * Connect to the websocket and establish connection.
   * @param protocol - The SignalR protocol version.
   */
  public async _connect(protocol = 1.5): Promise<void> {
    const url = new URL(`${this.url.replace(/^http/, "ws")}/connect`);
    const query = new URLSearchParams({
      ...this.query,
      connectionData: JSON.stringify(this._hubNames),
      clientProtocol: String(protocol),
      transport: "webSockets",
      connectionToken: String(this.connection.token),
      tid: "10",
    });
    url.search = query.toString();

    const webSocket = await createSocketConnection(url.toString(), {
      headers: this.headers,
    });

    webSocket.onopen = async () => {
      this._invocationId = 0;
      this._callTimeout = 0;
      try {
        await this._start();
        this._reconnectCount = 0;
        this.post(["connected", undefined]);
        if (this.connection) {
          this.connection.state = ConnectionState.connected;
        }
        this._markLastMessage();
        if (this._keepAlive) this._beat();
      } catch (error) {
        this.connection.state = ConnectionState.disconnected;
        await this._error(error.code, error.message);
      }
    };
    webSocket.onerror = (event: Event | ErrorEvent) => {
      if ("error" in event) this._error(ErrorCode.socketError, event.error);
    };
    webSocket.onmessage = (message: MessageEvent<unknown>) => {
      this._receiveMessage(message);
    };
    webSocket.onclose = () => {
      this._callTimeout = 1000;
      this.connection.state = ConnectionState.disconnected;
      this.post(["disconnected", "failed"]);
      this._reconnect();
    };
    this._websocket = webSocket;
  }

  /**
   * Attempt a reconnection to the websocket.
   * @param restart - Whether it should attempt completely reconnect.
   */
  public _reconnect(restart = false): void {
    if (
      this._reconnectTimer ||
      (this.connection.state === ConnectionState.reconnecting)
    ) {
      return;
    }

    this._clearBeatTimer();
    this._close();
    this._reconnectTimer = setTimeout(() => {
      this._reconnectCount++;
      this.connection.state = ConnectionState.reconnecting;
      this.post(["reconnecting", this._reconnectCount]);
      if (restart) this.start().then();
      else this._connect().then();
      this._reconnectTimer = undefined;
    }, this.reconnectDelayTime ?? 5000);
  }

  /**
   * Clear the current reconnect timer if it exists
   */
  public _clearReconnectTimer(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = undefined;
    }
  }

  /**
   * Add a new heartbeat instance.
   */
  public _beat(): void {
    if (this.connection.state === ConnectionState.connected) {
      const timeElapsed = new Date().getTime() - this.connection.lastMessageAt;
      if (timeElapsed > this._keepAliveTimeout) {
        this.connection.state = ConnectionState.disconnected;
        this._error(ErrorCode.connectLost);
      } else {
        this._beatTimer = setTimeout(() => {
          this._beat();
        }, this._beatInterval);
      }
    }
  }

  /**
   * Clear the beat timer.
   */
  public _clearBeatTimer(): void {
    if (this._beatTimer) {
      clearTimeout(this._beatTimer);
      this._beatTimer = undefined;
    }
  }

  /**
   * Mark the last message time as current time.
   */
  public _markLastMessage(): void {
    this.connection.lastMessageAt = new Date().getTime();
  }

  /**
   * Start the SignalR connection.
   * @param protocol - The SignalR protocol version.
   */
  public async _start(protocol = 1.5): Promise<unknown> {
    const query = new URLSearchParams({
      ...this.query,
      connectionData: JSON.stringify(this._hubNames),
      clientProtocol: String(protocol),
      transport: "webSockets",
      connectionToken: String(this.connection.token),
    });
    const headers = new Headers(this.headers);
    const url = new URL(`${this.url}/start`);
    url.search = query.toString();

    let data: Response;
    try {
      data = await fetch(url.toString(), {
        method: "GET",
        headers: headers,
      });
    } catch (error) {
      throw { code: ErrorCode.startError, message: error };
    }

    if (data.ok) {
      return await data.json();
    } else if (
      data.status === 302 || data.status === 401 || data.status === 403
    ) {
      throw { code: ErrorCode.unauthorized, message: null };
    } else {
      throw { code: ErrorCode.startError, message: data.status };
    }
  }

  /**
   * Abort the SignalR connection
   * @public
   * @param protocol - The SignalR client protocol
   */
  public async _abort(protocol = 1.5): Promise<void> {
    const query = new URLSearchParams({
      ...this.query,
      connectionData: JSON.stringify(this._hubNames),
      clientProtocol: String(protocol),
      transport: "webSockets",
      connectionToken: String(this.connection.token),
    });
    const headers = new Headers(this.headers);
    const url = new URL(`${this.url}/abort`);
    url.search = query.toString();

    let data: Response;
    try {
      data = await fetch(url.toString(), {
        method: "POST",
        headers: headers,
      });
    } catch (error) {
      throw { code: ErrorCode.abortError, message: error };
    }

    if (!data.ok) {
      if (
        data.status === 302 || data.status === 401 || data.status === 403
      ) {
        throw { code: ErrorCode.unauthorized, message: null };
      } else {
        throw { code: ErrorCode.abortError, message: data.status };
      }
    }
  }

  /**
   * Emit an error and attempt a reconnect if startError or connectLost.
   * @param code - SignalRError code to emit.
   * @param extra - Extra data to emit
   */
  public async _error(code: ErrorCode, extra?: unknown): Promise<void> {
    this.post(["error", {
      code: code,
      message: extra,
    }]);
    if (code === ErrorCode.negotiateError || code === ErrorCode.connectError) {
      await this._reconnect(true);
    } else if (
      code === ErrorCode.startError || code === ErrorCode.connectLost
    ) {
      await this._reconnect();
    }
  }

  /**
   * Close the SignalR instance by closing the websocket.
   */
  public _close(): void {
    if (this._websocket) {
      this._websocket.onclose = () => {};
      this._websocket.onmessage = () => {};
      this._websocket.onerror = () => {};
      this._websocket.close();
      this._websocket = undefined;
    }
  }

  /**
   * Start the SignalR connection.
   * @param protocol - The client protocol version.
   */
  public async start(protocol = 1.5): Promise<void> {
    if (!this._bound) {
      if (!this.url) return this._error(ErrorCode.invalidURL);
      if (!(this.url.startsWith("http:") || this.url.startsWith("https:"))) {
        return await this._error(ErrorCode.invalidProtocol);
      }
      if (Array.isArray(this._hubNames)) {
        const hubs: unknown[] = [];
        for (const hub of this._hubNames) hubs.push({ name: hub });
        this._hubNames = hubs;
      } else return this._error(ErrorCode.noHub);
      this._bound = true;
    }

    try {
      const negotiateProtocol = await this._negotiate(protocol);
      if (
        typeof negotiateProtocol.ConnectionToken === "string" &&
        typeof negotiateProtocol.ConnectionId === "string"
      ) {
        this.connection.token = negotiateProtocol.ConnectionToken;
        this.connection.id = negotiateProtocol.ConnectionId;
      }
      if (
        negotiateProtocol.KeepAliveTimeout &&
        typeof negotiateProtocol.KeepAliveTimeout === "number"
      ) {
        this._keepAlive = true;
        this._keepAliveTimeout = negotiateProtocol.KeepAliveTimeout * 1000;
        this._beatInterval = this._keepAliveTimeout / 4;
      } else {
        this._keepAlive = false;
      }
      await this._connect(protocol);
    } catch (error) {
      this.connection.state = ConnectionState.disconnected;
      await this._error(error.code, error.message);
    }
  }

  /**
   * End the SignalR connection.
   */
  public end() {
    if (this._websocket) {
      this.post(["disconnected", "end"]);
      this._abort().catch();
      this._clearReconnectTimer();
      this._clearBeatTimer();
      this._close();
    }
  }
}

export { to };
