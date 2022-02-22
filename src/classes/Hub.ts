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
  public handlers: Record<
    string,
    Record<string, (message: Message[2]) => void>
  > = {};

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
  public on(
    hub: Message[0],
    method: Message[1],
    callback: (message: Message[2]) => unknown,
  ): void {
    let handler: Record<string, unknown> = this.handlers[hub];
    if (!handler) handler = this.handlers[hub] = {};
    handler[method] = callback;
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
  public call(
    hub: Message[0],
    method: Message[1],
    args: Message[3],
  ): Promise<unknown> {
    if (!this.client) throw new Error();

    const messages = this._processInvocationArgs(args);
    const invocationId = this.client._invocationId;
    const timeoutTimer = setTimeout(() => {
      delete this.callbacks[invocationId];
    }, this.client._callTimeout ?? this.client.callTimeout ?? 5000);
    return new Promise((resolve, reject) => {
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
  public invoke(hub: Message[0], method: Message[1], args: Message[3]): void {
    const messages = this._processInvocationArgs(args);
    if (this.client) this.client._sendMessage(hub, method, messages);
  }
}
