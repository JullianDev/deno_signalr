a Deno port of [node-signalr](https://github.com/alex8088/node-signalr)
# deno-signalr
 A SignalR client for Deno
* ✅ Supports ASP.net
* ✅ Written in TypeScript
* ✅ Supports custom queries and headers
* ✅ Lots of TSDoc integration
* ✅ Asynchronous
* ❌ Does not support ASP.net Core


## Credits
 * [node-signalr](https://github.com/alex8088/node-signalr) - (Original) by [alex.wei](https://github.com/alex8088)
 * [Julli4n](https://github.com/Julli4n) - Ported the original


## License
[MIT](./LICENSE)


## Dependencies
* [Evt](https://deno.land/x/evt)
  * Used for Event Emitters
* [Custom Socket](https://deno.land/x/custom_socket)
  * Used for custom headers on WebSockets


# Documentation
**NOTICE: This documentation is as of v0.3, usage may change drastically as it reaches v1**


## Importing
As like any other 3rd-party Deno module, it can be imported with the `import` statement to the mod.ts URL.
```typescript
import * as SignalR from "https://deno.land/x/deno_signalr/mod.ts";
```


## Creating a client
Assuming that it has already been imported:
```typescript
const MyClient = new SignalR.Client("https://localhost:8080/signalr", [ "MyTestHub" ], { 
    query: {
        MyOptionalQuery: "MyOptionalQueryValue"
    },
    headers: {
        MyOptionalHeader: "MyOptionalHeaderValue"
    },
    callTimeout: 5000,
    reconnectDelayTime: 5000
});
```
This will create a new SignalR client instance with the parameters given.

`
new Client(string endpoint, Array<string> hubs[, ClientOptions options])
`


The ClientOptions interface is the following:


```typescript
export interface ClientOptions {
    /**
     * The queries to add to the URL
     */
    query?: Record<string, unknown>,
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
```


## Configuring a client
After creating the client, it can still be configured:
```typescript
// Custom headers
MyClient.headers["MyOptionalHeader"] = "nyOptionalVHeaderValue";
// Custom query
MyClient.query["MyOptionalQuery"] = "MyOptionalQueryValue";
// Timeout for sending messages
MyClient.callTimeout = 10000; // 10s, default: 5000ms (5s)
// Delay time for reconnecting
MyClient.reconnectDelayTime = 2000; // 2s, default: 5000ms (5s)
```


## Binding client events
deno-signalr takes advantage of the [Evt](https://deno.land/x/evt) module, which `Client` extends:
```typescript
// Attach until dettached
// MyClient.$attach(SignalR.to(eventName), callback);
// Attach and then dettach after one time
// MyClient.$attachOnce(SignalR.to(eventName), callback);
MyClient.$attach(SignalR.to("connected", () => {
    console.log("SignalR in Deno Example: Connected");
}));
MyClient.$attach(SignalR.to("reconnecting", (connectionCount: number) => {
    console.log(`SignalR in Deno Example: Connecting... ${connectionCount} tries`);
}));
MyClient.$attach(SignalR.to("disconnected", (reason: string) => {
    console.log(`SignalR in Deno Example: Disconnected, reason "${reason}"`);
}));
MyClient.$attach(SignalR.to("error", (error: SignalR.StandardError) => {
    console.log(`SignalR in Deno Example: Error, code: ${error.code}, message: ${typeof(error.message) === "string" ? error.message : "none"}`);
}));
```


## Binding a hub method

### Bind callback to receive messages
```typescript
MyClient.connection.hub.on("MyHub", "MyMethod", (message: unknown) => {
    console.log(`SignalR in Deno Example: New message from MyHub/MyMethod: ${message.toString()}`);
});
```

`
void Hub.on(string hub, string method, function callback)
`


### Call the method and return the values asynchronously
```typescript
MyClient.connection.hub.call("MyHub", "MyMethod", "hi from SignalR in Deno!").then((result: boolean) => {
    console.log(`SignalR in Deno Example: Sent message to MyHub/MyMethod success: ${result.toString()}`);
});
```

`
Promise<unknown> Hub.call(string hub, string method, unknown message)
`


### Invoke the method without return values
```typescript
MyClient.connection.hub.invoke("MyHub", "MyMethod", "hi from SignalR in Deno!");
```

`
void Hub.invoke(string hub, string method, unknown message)
`


## Starting the connection
When ready to start the connection to the Hubs, start the client:
```typescript
MyClient.start();
```
This will negotiate, start and connect with the hubs.

`
void Client.start(number protocol = 1.5)
`


## Ending the connection
When no longer needed, end the connection (if it exists):
```typescript
MyClient.end()
```

`
void Client.end()
`