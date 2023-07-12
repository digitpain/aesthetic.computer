// Session Server, 23.12.04.14.57
// Represents a "room" or user or "client" backend
// which at the moment is run once for every "piece"
// that requests it.

/* #region todo 📓 
 + Later
- [] `code.channel` should return a promise, and wait for a `code-channel:subbed`
    event here? This way users get better confirmation if the socket
    doesn't go through or if there is a server issue. 23.07.04.18.01
    (Might not actually be that necessary.)
 + Done
 - [x] Conditional redis sub to dev updates. (Will save bandwidth if extension
       gets lots of use, also would be more secure.) 
 - [x] Secure the "code" path to require a special string.
 - [x] Secure the "reload" path (must be in dev mode, sorta okay) 
 - [c] Speed up developer reload by using redis pub/sub.
 - [x] Send a signal to everyone once a user leaves.
 - [x] Get "developer" live reloading working again. 
 - [x] Add sockets back.
 - [x] Make a "local" option.
 - [x] Read through: https://redis.io/docs/data-types
#endregion */

// Add redis pub/sub here...

import Fastify from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import ip from "ip";
import chokidar from "chokidar";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
const redisConnectionString = process.env.REDIS_CONNECTION_STRING;
const dev = process.env.NODE_ENV === "development";

let fastify;

if (dev) {
  // Load local ssl certs in development mode.
  fastify = Fastify({
    https: {
      // allowHTTP1: true,
      key: fs.readFileSync("../ssl-dev/localhost-key.pem"),
      cert: fs.readFileSync("../ssl-dev/localhost.pem"),
    },
    logger: true,
  });
} else {
  fastify = Fastify({ logger: true }); // Still log in production. No reason not to?
}

const server = fastify.server;

const info = {
  port: process.env.PORT, // 8889 in development via `package.json`
  name: process.env.SPAWNER_NAME,
  url: process.env.SPAWNER_URL,
  service: process.env.SPAWNER_SERVICE,
};

const codeChannels = {}; // Used to filter `code` updates from redis to
//                          clients who explicitly have the channel set.

// *** Start up two `redis` clients. (One for subscribing, and for publishing)
const sub = !dev
  ? createClient({ url: redisConnectionString })
  : createClient();
sub.on("error", (err) => console.log("🔴 Redis subscriber client error!", err));

const pub = !dev
  ? createClient({ url: redisConnectionString })
  : createClient();
pub.on("error", (err) => console.log("🔴 Redis publisher client error!", err));

try {
  await sub.connect();
  await pub.connect();

  // TODO: This needs to be sent only for a specific user or needs
  //       some kind of special ID.
  await sub.subscribe("code", (message) => {
    const parsed = JSON.parse(message);
    if (codeChannels[parsed.codeChannel]) {
      const msg = pack("code", message, "development");
      subscribers(codeChannels[parsed.codeChannel], msg);
    }
  });

  await sub.subscribe("scream", (message) => {
    everyone(pack("scream", message, "screamer"));
  });
} catch (err) {
  console.error("🔴 Could not connect to `redis` instance.");
}

fastify.get("/", async () => {
  return {
    msg: "Hello, you've reached an aesthetic.computer session server instance!",
  };
});

// *** Live Reload of Pieces in Development ***
if (dev) {
  fastify.post("/reload", async (req) => {
    everyone(pack("reload", req.body, "pieces"));
    return { msg: "Reload request sent!", body: req.body };
  });
}

// *** HTTP Server Initialization ***
const start = async () => {
  try {
    if (dev) {
      fastify.listen({
        host: "0.0.0.0", // ip.address(),
        port: info.port,
      });
    } else {
      fastify.listen({ host: "0.0.0.0", port: info.port });
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

await start();

// *** Socket Server Initialization ***
// #region socket
let wss;
const connections = {};

let connectionId = 0; // TODO: Eventually replace with a username arrived at through
//                             a client <-> server authentication function.

wss = new WebSocketServer({ server });
console.log(
  `🤖 session.aesthetic.computer (${
    dev ? "Development" : "Production"
  }) socket: wss://${ip.address()}:${info.port}`
);

// Pack messages into a simple object protocol of `{type, content}`.
function pack(type, content, id) {
  return JSON.stringify({ type, content, id });
}

const interval = setInterval(function ping() {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) return client.terminate();
    client.isAlive = false;
    client.ping();
  });
}, 5000);

// Construct the server.
wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress || "localhost"; // beautify ip

  // Assign the conection a unique id.
  connections[connectionId] = ws;
  const id = connectionId;
  let codeChannel; // Used to subscribe to incoming piece code.

  // Send a single welcome message for every new client connection.
  // TODO: This message should be a JSON encoded object and be displayed on
  //       the client instead.
  const content = { ip, id, playerCount: wss.clients.size };

  // console.log("client length:", wss.clients.size);

  ws.send(pack("message", JSON.stringify(content), id));

  // Send a message to all other clients except this one.
  function others(string) {
    Object.keys(connections)
      /*wss.clients*/ .forEach((id) => {
        const c = connections[id];
        if (c !== ws && c?.readyState === WebSocket.OPEN) c.send(string);
      });
  }

  others(
    pack(
      "message",
      JSON.stringify({
        text: `${connectionId} has joined from ${ip}. Connections open: ${content.playerCount}`,
      }),
      id
    )
  );

  connectionId += 1;

  // Relay all incoming messages from this client to everyone else.
  ws.on("message", (data) => {
    // Parse incoming message and attach client identifier.
    const msg = JSON.parse(data.toString());
    msg.id = id; // TODO: When sending a server generated message, use a special id.
    if (msg.type === "scream") {
      // TODO: Alert all connected users via redis pub/sub to the scream.

      pub.publish("scream", msg.content, (error, reply) => {
        if (error) {
          console.error("Error publishing message:", error);
        } else {
          console.log(`Message published to channel ${channel}`);
        }
      });
    } else if (msg.type === "code-channel:sub") {
      // Filter code-channel updates based on this user.
      codeChannel = msg.content;
      if (!codeChannels[codeChannel]) codeChannels[codeChannel] = new Set();
      codeChannels[codeChannel].add(id);
    } else {
      // Relay any other message to every user.
      // TODO: Why not always use "others" here?
      console.log(msg);
      everyone(JSON.stringify(msg));
      // others(JSON.stringify(msg));
    }
  });

  // More info: https://stackoverflow.com/a/49791634/8146077
  ws.on("close", () => {
    everyone(pack("left", { id, count: wss.clients.size }));
    delete connections[id];

    // Clear out the codeChannel if the last user disconnects from it.
    if (codeChannel !== undefined) {
      codeChannels[codeChannel]?.delete(id);
      if (codeChannels[codeChannel]?.values().length === 0) {
        delete codeChannels[codeChannel];
      }
    }

    clearInterval(interval); // Stop pinging once the socket closes.
  });

  ws.isAlive = true; // For checking persistence between ping-pong messages.

  // Send a ping message to all clients every 10 seconds, and kill
  // the client if it does not respond back with a pong on any given pass.
  ws.on("pong", () => {
    // console.log("pong");
    ws.isAlive = true;
  }); // Receive a pong.
});

// Sends a message to all connected clients.
function everyone(string) {
  console.log(wss.clients.size);
  Object.keys(connections)
    /*wss.clients*/ .forEach((id) => {
      const c = connections[id];
      // console.log(c?.readyState, string);
      if (c?.readyState === WebSocket.OPEN) c.send(string);
    });
}

// Sends a message to a particular set of client ids on
// this instance that have are part of the `subs` Set.
function subscribers(subs, msg) {
  subs.forEach((connectionId) => {
    connections[connectionId]?.send(msg);
  });
}

// 🚧 File Watching in Local Development Mode
// File watching uses: https://github.com/paulmillr/chokidar
if (dev) {
  // 1. Watch for local file changes in pieces.
  chokidar
    .watch("../system/public/aesthetic.computer/disks")
    .on("all", (event, path) => {
      if (event === "change") everyone(pack("reload", { piece: "*" }, "local"));
    });

  // 2. Watch base system files.
  chokidar
    .watch([
      "../system/public/aesthetic.computer/lib",
      "../system/public/aesthetic.computer/boot.js",
      "../system/public/aesthetic.computer/bios.js",
      "../system/public/aesthetic.computer/style.css",
    ])
    .on("all", (event, path) => {
      if (event === "change")
        everyone(pack("reload", { piece: "*refresh*" }, "local"));
    });
}
// #endregion
