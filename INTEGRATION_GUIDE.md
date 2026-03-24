# NCG FleetFlow — External System Integration Guide

> Complete reference for the WhatsApp + Email integration and a step-by-step blueprint for adding any new external system (SMS, Telegram, CRM, payment gateway, etc.).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Quick Start](#2-quick-start)
3. [Connection Lifecycle](#3-connection-lifecycle)
4. [WhatsApp Server — API Reference](#4-whatsapp-server--api-reference)
5. [WebSocket Events Reference](#5-websocket-events-reference)
6. [Frontend Components](#6-frontend-components)
7. [Email Integration Reference](#7-email-integration-reference)
8. [Environment Variables](#8-environment-variables)
9. [Adding a New External System — Step-by-Step Blueprint](#9-adding-a-new-external-system--step-by-step-blueprint)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                   npm run dev  (concurrently)                      │
│                                                                    │
│  ┌──────────────────────┐       ┌────────────────────────────────┐ │
│  │  Vite Dev Server     │       │  WhatsApp Server (Express)     │ │
│  │  Port 8080           │       │  Port 3001                     │ │
│  │                      │       │                                │ │
│  │  React Frontend      │──────▶│  REST API  (/api/*)            │ │
│  │  WhatsAppHub.tsx     │       │  WebSocket (ws://…/ws)         │ │
│  │  Settings.tsx        │       │                                │ │
│  │                      │◀──────│  Real-time broadcasts          │ │
│  └──────────────────────┘       │                                │ │
│                                 │  ┌──────────────┐ ┌──────────┐ │ │
│                                 │  │ whatsapp-    │ │ node-    │ │ │
│                                 │  │ web.js       │ │ mailer   │ │ │
│                                 │  │ (WhatsApp)   │ │ (Email)  │ │ │
│                                 │  └──────┬───────┘ └────┬─────┘ │ │
│                                 └─────────┼──────────────┼───────┘ │
│                                           │              │         │
└───────────────────────────────────────────┼──────────────┼─────────┘
                                            ▼              ▼
                                      WhatsApp Web    Gmail / SMTP
```

### Key Design Principles

| Principle                   | How It's Implemented                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| **Auto-start**              | `concurrently` in `package.json` runs both servers with one command       |
| **Real-time**               | WebSocket broadcasts status changes and messages instantly                |
| **REST fallback**           | HTTP endpoints for polling, sending, and configuration                    |
| **Session persistence**     | `LocalAuth` saves WhatsApp session to `.wwebjs_auth/` (survives restarts) |
| **Disconnect/Reconnect**    | Full lifecycle: logout → destroy → clear session → restart                |
| **Frontend auto-reconnect** | WebSocket reconnects every 3 seconds if connection drops                  |

---

## 2. Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Google Chrome** installed (for Puppeteer/whatsapp-web.js)
- A **WhatsApp phone** to scan QR code

### Install & Run

```bash
# 1. Install root dependencies
npm install

# 2. Install WhatsApp server dependencies
cd whatsapp-server && npm install && cd ..

# 3. Start everything (one command)
npm run dev
```

This runs `concurrently`:

- 🔵 **app** → `vite` (frontend on port 8080)
- 🟢 **wa** → `node whatsapp-server/server.js` (backend on port 3001)

### Individual Server Commands

```bash
npm run dev:app   # Frontend only
npm run dev:wa    # WhatsApp server only
```

### First-Time Connection

1. Open `http://localhost:8080/whatsapp`
2. Wait for the QR code to appear
3. Open WhatsApp on your phone → **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code
5. ✅ Connected! Chats will load automatically

---

## 3. Connection Lifecycle

### WhatsApp Connection Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ DISCONNECTED │────▶│   QR_READY   │────▶│  CONNECTING  │────▶│  CONNECTED   │
│              │     │              │     │ (auth'd)     │     │              │
│ Server boots │     │ QR displayed │     │ Session      │     │ Ready to     │
│ or session   │     │ on frontend  │     │ validating   │     │ send/receive │
│ expired      │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
       ▲                                                              │
       │              ┌──────────────┐                                │
       └──────────────│ DISCONNECT   │◀───────────────────────────────┘
                      │ (user action │     User clicks "Switch Account"
                      │  or error)   │     → logout → destroy → clear
                      └──────────────┘       session → process restart
```

### State Transitions (in `server.js`)

| Event                          | Old Status   | New Status     | Broadcast                                                                     |
| ------------------------------ | ------------ | -------------- | ----------------------------------------------------------------------------- |
| `waClient.on('qr')`            | disconnected | `qr_ready`     | `{ type: 'qr', data: <dataURL> }`                                             |
| `waClient.on('authenticated')` | qr_ready     | `connecting`   | `{ type: 'status', data: { status: 'connecting' } }`                          |
| `waClient.on('ready')`         | connecting   | `connected`    | `{ type: 'status', data: { status: 'connected', info: {...} } }`              |
| `waClient.on('disconnected')`  | connected    | `disconnected` | `{ type: 'status', data: { status: 'disconnected', reason } }`                |
| `waClient.on('auth_failure')`  | any          | `disconnected` | `{ type: 'status', data: { status: 'auth_failed', error } }`                  |
| `POST /api/disconnect`         | connected    | `disconnected` | `{ type: 'status', data: { status: 'disconnected', reason: 'user_switch' } }` |

### Session Persistence

- **Where**: `whatsapp-server/.wwebjs_auth/` directory
- **What**: Chromium session data (cookies, local storage, etc.)
- **Effect**: If the directory exists, the server skips QR and goes straight to `connecting` → `connected`
- **Clear**: `POST /api/disconnect` deletes this directory and restarts the process

---

## 4. WhatsApp Server — API Reference

> Base URL: `http://localhost:3001` (or `VITE_WA_SERVER` env variable)

### `GET /api/status`

Get current connection status.

**Response:**

```json
{
  "status": "connected", // "disconnected" | "qr_ready" | "connecting" | "connected"
  "info": {
    "pushname": "John", // WhatsApp display name
    "phone": "94771234567", // Phone number
    "platform": "smba" // Platform identifier
  }
}
```

---

### `GET /api/qr`

Get the current QR code (if waiting for scan).

**Response (waiting for scan):**

```json
{
  "status": "qr_ready",
  "qr": "data:image/png;base64,..." // QR as data URL
}
```

**Response (already connected):**

```json
{
  "status": "connected",
  "qr": null
}
```

---

### `POST /api/send`

Send a WhatsApp message to a phone number.

**Request:**

```json
{
  "phone": "94771234567", // Country code + number, no leading +
  "message": "Hello!"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "true_94771234567@c.us_3EB...",
  "timestamp": 1709363400000
}
```

**Errors:**

- `400` — Missing phone or message
- `503` — WhatsApp not connected

---

### `GET /api/chats`

Fetch recent chats (top 30).

**Response:**

```json
[
  {
    "id": "94771234567@c.us",
    "name": "John Doe",
    "isGroup": false,
    "unreadCount": 2,
    "timestamp": 1709363400000,
    "lastMessage": {
      "body": "Hello",
      "timestamp": 1709363400000,
      "fromMe": false
    },
    "phone": "94771234567"
  }
]
```

---

### `GET /api/messages/:chatId`

Fetch messages for a specific chat.

| Parameter | Type  | Description                      |
| --------- | ----- | -------------------------------- |
| `chatId`  | path  | Chat ID, e.g. `94771234567@c.us` |
| `limit`   | query | Number of messages (default: 30) |

**Response:**

```json
[
  {
    "id": "true_94771234567@c.us_3EB...",
    "body": "Hello!",
    "timestamp": 1709363400000,
    "fromMe": true,
    "hasMedia": false,
    "type": "chat"
  }
]
```

---

### `GET /api/log`

Get the in-memory message log (last 500 messages).

---

### `POST /api/disconnect`

Disconnect WhatsApp, clear session, and restart the server to show a new QR code.

> ⚠️ This triggers `process.exit(0)` after 2 seconds. The `concurrently` runner will restart the process automatically.

**Response:**

```json
{
  "success": true,
  "message": "Disconnected. Restarting server — reconnect in 5 seconds to scan new QR."
}
```

---

## 5. WebSocket Events Reference

> Endpoint: `ws://localhost:3001/ws`

### On Connect

When a WebSocket client connects, it immediately receives the current state:

```json
{
  "type": "status",
  "data": {
    "status": "connected", // current status
    "info": { "pushname": "...", "phone": "..." },
    "qr": null // or data URL if QR is active
  }
}
```

### Broadcast Events

| Event Type | Payload                              | When                         |
| ---------- | ------------------------------------ | ---------------------------- |
| `status`   | `{ status, info?, reason?, error? }` | Connection state changes     |
| `qr`       | `<data URL string>`                  | New QR code generated        |
| `message`  | `WAMessage` object                   | Incoming or outgoing message |

### WAMessage Object Shape

```typescript
interface WAMessage {
  id: string;
  from: string; // sender@c.us
  to: string; // recipient@c.us
  body: string;
  timestamp: number; // unix ms
  fromMe: boolean;
  hasMedia: boolean;
  type: string; // "chat", "image", etc.
  contactName: string;
  contactNumber: string;
}
```

### Frontend Auto-Reconnect Pattern

```typescript
const connectWS = () => {
  const ws = new WebSocket("ws://localhost:3001/ws");
  ws.onclose = () => {
    setTimeout(connectWS, 3000); // Retry every 3 seconds
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "status") {
      /* update UI */
    }
    if (data.type === "qr") {
      /* show QR code */
    }
    if (data.type === "message") {
      /* add to chat */
    }
  };
};
```

---

## 6. Frontend Components

### File Structure

```
src/
├── pages/
│   └── WhatsAppHub.tsx          # Main page (route: /whatsapp)
├── components/
│   └── ai-chatbot/
│       └── AIChatbotSettings.tsx # Example of settings-tab pattern
└── App.tsx                       # Route definition
```

### WhatsAppHub Page Features

| Tab             | Features                                                     |
| --------------- | ------------------------------------------------------------ |
| **Chats**       | Search, select chat, view messages, reply (real-time via WS) |
| **New Message** | Send to any phone number using country code                  |
| **Templates**   | Pre-built message templates, use in WhatsApp or Email        |
| **Email**       | Configure SMTP, send emails, disconnect                      |

### Route Registration (in `App.tsx`)

```tsx
import WhatsAppHub from "./pages/WhatsAppHub";

// Inside routes:
<Route path="/whatsapp" element={<WhatsAppHub />} />;
```

---

## 7. Email Integration Reference

Email runs on the **same server** (`whatsapp-server/server.js`) alongside WhatsApp.

### Endpoints

| Method | Path                    | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/api/email/status`     | Check if email is configured    |
| `POST` | `/api/email/configure`  | Save email credentials & verify |
| `POST` | `/api/email/send`       | Send an email                   |
| `POST` | `/api/email/disconnect` | Remove saved credentials        |

### Configure Email

```json
POST /api/email/configure
{
  "email": "you@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx",    // Gmail App Password
  "senderName": "NCG Express",              // Display name
  "service": "gmail"                         // or custom host/port
}
```

### Send Email

```json
POST /api/email/send
{
  "to": "recipient@example.com",
  "subject": "Invoice #123",
  "body": "Please find attached...",
  "cc": "copy@example.com",     // optional
  "isHtml": false                // optional, set true for HTML body
}
```

### Persistence

- Credentials stored in `whatsapp-server/.email-settings.json`
- Loaded automatically on server restart
- Deleted when calling `POST /api/email/disconnect`

---

## 8. Environment Variables

### Frontend (`.env`)

| Variable                        | Default                 | Purpose              |
| ------------------------------- | ----------------------- | -------------------- |
| `VITE_WA_SERVER`                | `http://localhost:3001` | WhatsApp server URL  |
| `VITE_SUPABASE_URL`             | —                       | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | —                       | Supabase anon key    |

### Server (`whatsapp-server/server.js`)

| Variable | Default | Purpose             |
| -------- | ------- | ------------------- |
| `PORT`   | `3001`  | Express server port |

### Chrome Path (hardcoded in `server.js`)

```javascript
executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
```

Change this for different operating systems:

- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
- **Linux**: `/usr/bin/google-chrome-stable`

---

## 9. Adding a New External System — Step-by-Step Blueprint

Use this blueprint to add any new system (e.g., **Telegram**, **SMS via Twilio**, **CRM webhook**, etc.) following the exact same pattern as WhatsApp + Email.

### Step 1: Create the Server Module

Create a new directory or add to the existing server:

```
Option A: Add to existing server (recommended for related services)
  → Edit whatsapp-server/server.js, add new endpoints

Option B: Create a separate server (for independent services)
  → Create new-service-server/
  → new-service-server/server.js
  → new-service-server/package.json
```

#### Server Boilerplate (Option B)

```javascript
// new-service-server/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ─── State ─── */
let connectionStatus = "disconnected";
let clientInfo = null;

/* ─── WebSocket Broadcasting ─── */
function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(json);
  });
}

wss.on("connection", (ws) => {
  // Send current state on connect
  ws.send(
    JSON.stringify({
      type: "status",
      data: { status: connectionStatus, info: clientInfo },
    }),
  );
});

/* ─── REST Endpoints ─── */

// Get status
app.get("/api/status", (req, res) => {
  res.json({ status: connectionStatus, info: clientInfo });
});

// Connect
app.post("/api/connect", async (req, res) => {
  try {
    // TODO: Initialize your service client
    connectionStatus = "connected";
    broadcast({ type: "status", data: { status: "connected" } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post("/api/send", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message)
      return res.status(400).json({ error: "Missing fields" });
    if (connectionStatus !== "connected")
      return res.status(503).json({ error: "Not connected" });
    // TODO: Send via your service
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect
app.post("/api/disconnect", async (req, res) => {
  try {
    // TODO: Cleanup your service client
    connectionStatus = "disconnected";
    clientInfo = null;
    broadcast({ type: "status", data: { status: "disconnected" } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ─── Start ─── */
const PORT = process.env.PORT || 3002; // Use a different port!
server.listen(PORT, () => {
  console.log(`🚀 New Service running on http://localhost:${PORT}`);
});
```

#### `package.json` for New Server

```json
{
  "name": "new-service-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "ws": "^8.18.0"
  }
}
```

### Step 2: Register in `concurrently` (Auto-Start)

Edit the root `package.json` to include your new server:

```diff
 "scripts": {
-  "dev": "concurrently -n app,wa -c blue,green \"vite\" \"node whatsapp-server/server.js\"",
+  "dev": "concurrently -n app,wa,svc -c blue,green,magenta \"vite\" \"node whatsapp-server/server.js\" \"node new-service-server/server.js\"",
   "dev:app": "vite",
   "dev:wa": "node whatsapp-server/server.js",
+  "dev:svc": "node new-service-server/server.js",
 }
```

Now `npm run dev` starts **all three processes** automatically.

### Step 3: Add Environment Variable

In `.env`:

```
VITE_NEW_SERVICE_SERVER=http://localhost:3002
```

In your frontend code:

```typescript
const SERVICE_URL =
  import.meta.env.VITE_NEW_SERVICE_SERVER || "http://localhost:3002";
```

### Step 4: Create the Frontend Page

Create `src/pages/NewServiceHub.tsx` following the WhatsApp Hub pattern:

```tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
// ... import your UI components

const SERVICE_URL =
  import.meta.env.VITE_NEW_SERVICE_SERVER || "http://localhost:3002";
const SERVICE_WS = SERVICE_URL.replace(/^http/, "ws") + "/ws";

export default function NewServiceHub() {
  const [serverOnline, setServerOnline] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebSocket with auto-reconnect ──
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(SERVICE_WS);
      wsRef.current = ws;
      ws.onopen = () => setServerOnline(true);
      ws.onclose = () => {
        setServerOnline(false);
        reconnectTimer.current = setTimeout(connectWS, 3000);
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "status") setStatus(data.data.status);
        // Handle other event types...
      };
    } catch {
      setServerOnline(false);
      reconnectTimer.current = setTimeout(connectWS, 3000);
    }
  }, []);

  useEffect(() => {
    connectWS();
    return () => {
      reconnectTimer.current && clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  // ── REST calls ──
  const connect = () => fetch(`${SERVICE_URL}/api/connect`, { method: "POST" });
  const disconnect = () =>
    fetch(`${SERVICE_URL}/api/disconnect`, { method: "POST" });
  const send = (to: string, message: string) =>
    fetch(`${SERVICE_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    }).then((r) => r.json());

  return (
    <div className="space-y-6 p-6">
      {/* Status indicator, connect/disconnect buttons, messaging UI */}
    </div>
  );
}
```

### Step 5: Register the Route

In `src/App.tsx`:

```tsx
import NewServiceHub from "./pages/NewServiceHub";

// Inside <Routes>:
<Route path="/new-service" element={<NewServiceHub />} />;
```

### Step 6: Add to Settings Page (Optional)

To add a settings tab, edit `src/pages/Settings.tsx`:

1. Add the import
2. Add a `<TabsTrigger>` in the tabs list
3. Add a `<TabsContent>` with your settings component

### Checklist for Adding a New System

- [ ] Create server directory with `server.js` and `package.json`
- [ ] Install dependencies: `cd new-service-server && npm install`
- [ ] Add to `concurrently` in root `package.json`
- [ ] Add `VITE_*` env variable if needed
- [ ] Create frontend page component
- [ ] Register route in `App.tsx`
- [ ] Add navigation link in sidebar/menu
- [ ] (Optional) Add settings tab in `Settings.tsx`
- [ ] Test with `npm run dev` — all servers should auto-start
- [ ] Verify connect, send message, disconnect cycle

---

## 10. Troubleshooting

### WhatsApp Server Won't Start

| Issue                 | Fix                                                   |
| --------------------- | ----------------------------------------------------- |
| Chrome not found      | Update `executablePath` in `server.js` for your OS    |
| Port 3001 in use      | Kill the process: `lsof -ti :3001 \| xargs kill -9`   |
| QR code never appears | Delete `.wwebjs_auth/` and restart                    |
| Auth keeps failing    | Clear session: `rm -rf whatsapp-server/.wwebjs_auth/` |

### Frontend Can't Connect

| Issue                        | Fix                                                  |
| ---------------------------- | ---------------------------------------------------- |
| "Server starting..." forever | Check if `whatsapp-server` is running on port 3001   |
| CORS errors                  | Verify `cors({ origin: '*' })` in server.js          |
| Wrong port                   | Set `VITE_WA_SERVER=http://localhost:3001` in `.env` |

### Email Issues

| Issue              | Fix                                                     |
| ------------------ | ------------------------------------------------------- |
| Auth failed        | Use a Gmail **App Password**, not your regular password |
| Connection timeout | Check firewall / network allows SMTP (port 587)         |
| Credentials lost   | They persist in `whatsapp-server/.email-settings.json`  |

### Adding a New System

| Issue                      | Fix                                                                |
| -------------------------- | ------------------------------------------------------------------ |
| Server not auto-starting   | Check `concurrently` command in `package.json`                     |
| WebSocket reconnect loop   | Verify the server is actually running on the expected port         |
| Process exit on disconnect | The `concurrently` runner restarts crashed processes automatically |

---

## File Reference

| File                                   | Purpose                                    |
| -------------------------------------- | ------------------------------------------ |
| `package.json`                         | Root config with `concurrently` dev script |
| `whatsapp-server/server.js`            | WhatsApp + Email backend (Express + WS)    |
| `whatsapp-server/package.json`         | Server dependencies                        |
| `whatsapp-server/.wwebjs_auth/`        | WhatsApp session data (auto-generated)     |
| `whatsapp-server/.email-settings.json` | Saved email credentials (auto-generated)   |
| `src/pages/WhatsAppHub.tsx`            | Frontend page (1076 lines)                 |
| `src/App.tsx`                          | Route: `path="/whatsapp"` at line 797      |
| `.env`                                 | Environment variables                      |

---

_Last updated: 2026-03-02_
