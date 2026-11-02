/* --------------------------------------------------
 * Final Production Server
 * - Web + WebSocket
 * - Unity Binary Forwarding
 * - Ping / Pong Heartbeat
 * - Graceful Shutdown
 * -------------------------------------------------- */

const http = require("http");
const WebSocket = require("ws");
const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 8081;

/* --------------------------------------------------
 * Express (Web)
 * -------------------------------------------------- */
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/* --------------------------------------------------
 * Global State
 * -------------------------------------------------- */
let unitySocket = null;

/* --------------------------------------------------
 * WebSocket Main
 * -------------------------------------------------- */
wss.on("connection", (ws) => {
  ws.role = "browser";
  ws.pendingHeader = null;
  ws.isAlive = true;

  // 初始回報 Unity 狀態
  ws.send(JSON.stringify({
    type: "UNITY_STATUS",
    connected: !!unitySocket
  }));

  /* ---------- Pong ---------- */
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  /* ---------- Message ---------- */
  ws.on("message", (data, isBinary) => {

    /* ============================
     * Binary (Image)
     * ============================ */
    if (isBinary) {
      if (!ws.pendingHeader) {
        console.warn("⚠️ Binary without HEADER, ignored");
        return;
      }

      if (!unitySocket || unitySocket.readyState !== WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ERROR",
          reason: "Unity disconnected"
        }));
        ws.pendingHeader = null;
        return;
      }

      try {
        // Header → Unity
        unitySocket.send(JSON.stringify({
          type: "BANNER_DATA",
          id: ws.pendingHeader.id,
          dishCode: ws.pendingHeader.meta?.dishCode,
          dishId: ws.pendingHeader.meta?.dishId
        }));

        // Binary → Unity
        unitySocket.send(data);

        // Ack Browser
        ws.send(JSON.stringify({
          type: "UPLOAD_OK",
          id: ws.pendingHeader.id
        }));

        console.log(`📤 Forwarded to Unity: ${ws.pendingHeader.id}`);
      } catch (err) {
        console.error("❌ Unity send failed:", err.message);
      }

      ws.pendingHeader = null;
      return;
    }

    /* ============================
     * Text (JSON)
     * ============================ */
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.warn("⚠️ Non-JSON message ignored");
      return;
    }
    /* ---------- ETA Update (from Unity) ---------- */
    if (msg.type === "ETA_UPDATE") {
      if (ws !== unitySocket) {
        console.warn("⚠️ ETA_UPDATE from non-unity ignored");
        return;
      }

      console.log("⏱ ETA Update:", msg);

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.role === "browser") {
          client.send(JSON.stringify(msg));
        }
      });
      return;
    }


    /* ---------- Unity Register ---------- */
    if (msg.type === "UNITY_REGISTER") {
      if (unitySocket && unitySocket !== ws) {
        console.warn("⚠️ Replacing existing Unity connection");
        try { unitySocket.close(); } catch { }
      }
      
      console.log("✅ Unity Registered Successfully");
      ws.role = "unity";
      unitySocket = ws;


      broadcastUnityStatus(true);
      return;
    }


    /* ---------- Browser Header ---------- */
    if (msg.type === "HEADER") {
      if (ws.pendingHeader) {
        ws.send(JSON.stringify({
          type: "ERROR",
          reason: "Previous upload not finished"
        }));
        return;
      }

      ws.pendingHeader = {
        id: msg.id,
        meta: msg.meta || {}
      };

      console.log(`📩 HEADER id=${msg.id}`);
      return;
    }

    /* ---------- Ping (App-level) ---------- */
    if (msg.type === "PING") {
      ws.isAlive = true;
      ws.send(JSON.stringify({ type: "PONG" }));
      return;
    }
  });

  /* ---------- Close ---------- */
  ws.on("close", (code, reason) => {
    console.log(`⚠️ Connection closed. Code: ${code}, Reason: ${reason}`);
    if (ws === unitySocket) {
      unitySocket = null;
      console.warn("⚠️ Unity disconnected");
      broadcastUnityStatus(false);
    }
  });

  ws.on("error", (err) => {
    console.warn("⚠️ WS error:", err.message);
  });
});

/* --------------------------------------------------
 * Heartbeat (Ping / Pong)
 * -------------------------------------------------- */
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      // 顯示被踢掉的是什麼角色
      console.warn(`💀 WS timeout, terminate [Role: ${ws.role}]`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
/* --------------------------------------------------
 * Broadcast Unity Status
 * -------------------------------------------------- */
function broadcastUnityStatus(connected) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "UNITY_STATUS",
        connected
      }));
    }
  });
}

/* --------------------------------------------------
 * Graceful Shutdown (Render / Cloud)
 * -------------------------------------------------- */
function shutdown() {
  console.log("🛑 Graceful shutdown");

  clearInterval(heartbeat);

  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "Server shutdown");
    }
  });

  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

/* --------------------------------------------------
 * Start
 * -------------------------------------------------- */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
