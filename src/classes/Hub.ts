import { Client } from "./Client.ts";
/**
 * SignalR hub for connections
 */
 export class Hub {
    /**
     * SignalR client
     * @public
     */
    public client?: Client;
    /**
     * Hub message handlers
     * @public
     */
    public handlers: Record<string, unknown> = {};
    /**
     * Hub message callbacks
     * @public
     */
    public callbacks: Record<number, unknown> = {};
    /**
     * Construct a SignalR hub
     * @param client - The SignalR client for the hub to use
     */
    constructor(client: Client) {
        this.client = client;
    }
    /**
     * Handle a callback
     * @public
     * @param invocationId - The invcoation ID
     */
    public _handleCallback(invocationId: number, error?: string, result?: boolean): void {
        const callback = this.callbacks[invocationId];
        if (callback && typeof(callback) === "function") callback(error, result);
    }
    /**
     * Bind events, receive messages
     * @public
     * @param hub - The hub name
     * @param method - The method name
     * @param callback - Function to be called on callback
     */
    public on(hub: string, method: string, callback: (error?: string, result?: string) => unknown): void {
        let handler: Record<string, unknown> | unknown = this.handlers[hub];
        if (!handler) handler = (this.handlers[hub] = {});
        // @ts-ignore: Handler was defined above
        handler[method] = callback;
    }
    /**
     * Process invocation arguments
     * @public
     * @param args - The invocation args
     */
    public _processInvocationArgs(args: unknown[]): unknown[] {
        const messages = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            messages.push((typeof arg === "function" || typeof arg === "undefined") ? null : arg);
        }
        return messages;
    }
    /**
     * Call with argumenets with return promise
     * @public 
     * @param hub - The SignalR hub
     * @param method - The SiggnalR hub method
     * @param args - The arguments as an ellipsis
     */
    public call(hub: string, method: string, ...args: unknown[]): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.client) return reject();
            const messages = this._processInvocationArgs(args);
            const invocationId = this.client._invocationId;
            const timeoutTimer = setTimeout(() => {
                delete this.callbacks[invocationId];
                reject("Timeout");
            }, this.client._callTimeout || this.client.callTimeout || 5000);
            this.callbacks[invocationId] = (error: string, result: string) => {
                clearTimeout(timeoutTimer);
                delete this.callbacks[invocationId];
                return error ? reject(error) : resolve(result);
            };
            this.client._sendMessage(hub, method, messages);
        })
    }
    /**
     * Call with arguments without a return value
     * @public
     * @param hub - The SignalR hub
     * @param method - The SignalR hub method
     * @param args - The arguments as an ellipsis
     */
    public invoke(hub: string, method: string, ...args: unknown[]): void {
        const messages = this._processInvocationArgs(args);
        if (this.client) this.client._sendMessage(hub, method, messages);
    }
}