import { type Client } from "./Client.ts";

/**
 * SignalR hub for connections.
 */
export class Hub<
  Message extends [string, string, unknown[], unknown[]] = [
    string,
    string,
    unknown[],
    unknown[],
  ],
> {
  /**
   * SignalR client
   */
  public client: Client<Message>;

  /**
   * Hub message handlers.
   */
  public handlers: [string, string, (message: Message[2]) => void][] = [];

  /**
   * Hub message callbacks.
   */
  public callbacks: Record<
    number,
    (error?: string, result?: string | boolean) => void
  > = {};

  /**
   * Construct a SignalR hub.
   * @param client - The SignalR client for the hub to use.
   */
  constructor(client: Client<Message>) {
    this.client = client;
  }

  /**
   * Handle a callback message.
   * @param invocationId - The invocation ID.
   * @param error - AN error string.
   * @param result - The result.
   */
  public _handleCallback(
    invocationId: number,
    error?: string,
    result?: boolean,
  ): void {
    const callback = this.callbacks[invocationId];
    if (callback && typeof (callback) === "function") callback(error, result);
  }

  /**
   * Bind events that will receive messages.
   * @param hub - The hub name.
   * @param method - The method name.
   * @param callback - Function to be called on callback.
   */
  public on<
    Hub extends Message[0],
    Method extends Extract<Message, [Hub, unknown, unknown, unknown]>[1],
  >(
    hub: Hub,
    method: Method,
    callback: (
      message: Extract<
        Message,
        [Hub, Method, unknown, unknown]
      >[2],
    ) => unknown,
  ): void {
    this.handlers.push([hub, method, callback]);
  }

  /**
   * Process invocation arguments.
   * @param args - The invocation args.
   */
  public _processInvocationArgs(args: Message[3]): Message[3] {
    return args.map((arg) =>
      (typeof arg === "function" || typeof arg === "undefined") ? null : arg
    );
  }

  /**
   * Call with arguments with return promise.
   * @param hub - The SignalR hub.
   * @param method - The SignalR hub method.
   * @param args - The arguments.
   */
  public call<
    Hub extends Message[0],
    Method extends Extract<Message, [Hub, unknown, unknown, unknown]>[1],
  >(
    hub: Hub,
    method: Method,
    args: Extract<Message, [Hub, Method, unknown, unknown]>[3],
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const messages = this._processInvocationArgs(args);
      const invocationId = this.client._invocationId;
      const timeoutTimer = setTimeout(() => {
        delete this.callbacks[invocationId];
        reject(new Error("Timeout"));
      }, this.client._callTimeout || this.client.callTimeout || 5000);
      this.callbacks[invocationId] = (
        error?: string,
        result?: string | boolean,
      ) => {
        clearTimeout(timeoutTimer);
        delete this.callbacks[invocationId];
        if (error) reject(error);
        resolve(result);
      };
      this.client._sendMessage(hub, method, messages);
    });
  }

  /**
   * Call with arguments without a return value.
   * @param hub - The SignalR hub.
   * @param method - The SignalR hub method.
   * @param args - The arguments.
   */
  public invoke<
    Hub extends Message[0],
    Method extends Extract<Message, [Hub, unknown, unknown, unknown]>[0],
  >(
    hub: Hub,
    method: Method,
    args: Extract<Message, [Hub, Method, unknown, unknown]>[3],
  ): void {
    const messages = this._processInvocationArgs(args);
    if (this.client) this.client._sendMessage(hub, method, messages);
  }
}
