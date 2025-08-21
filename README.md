# 📧 Gmail MCP Server

A **Model Context Protocol (MCP)** server for integrating Gmail with **GitHub Copilot Chat in VS Code**.  
This server exposes Gmail functions as tools so you can interact with your inbox directly from Copilot.

---

## 🎥 Demo

[![Watch Demo](https://img.youtube.com/vi/YhedLMuceyg/hqdefault.jpg)](https://www.youtube.com/watch?v=YhedLMuceyg)

> Click the image or [watch the demo here](https://www.youtube.com/watch?v=YhedLMuceyg)

---

## 🚀 Features
- **Send Emails** – Compose and send emails directly from Copilot.  
- **List Emails** – Fetch recent emails with optional Gmail search queries.  
- **Read Emails** – View the subject, sender, date, and body of a specific email.  
- **Count Emails Today** – Get the number of emails you received today.  
- **Summarize Emails** – Emails can be summarized by Copilot using the read function.  

---

## 🛠 Requirements
- Node.js (v18 or higher)  
- npm (or yarn/pnpm)  
- A Google Cloud project with the **Gmail API enabled**  
- Gmail OAuth credentials file: `credentials.json`  

---

## 📥 Setup

### 1) Clone this repository
```bash
git clone https://github.com/YOUR_USERNAME/gmail-mcp-server.git
cd gmail-mcp-server
```

### 2) Install dependencies
```bash
npm install
```

### 3) Add Gmail credentials
- Go to **Google Cloud Console** → APIs & Services → **Credentials**.  
- Create **OAuth client ID** with type **Desktop app**.  
- Download the JSON and save it as **`credentials.json`** in the project root.

> ⚠️ Keep `credentials.json` private. It is ignored by git via `.gitignore`.

### 4) Authorize the app (one-time)
```bash
npm run auth
```
- A browser window opens. Choose your account and click **Allow**.  
- This creates **`token.json`** in the project (also ignored by git).

---

## ▶️ Run the MCP Server

### Option A: Build then run
```bash
npm run build
npm run start
```

### Option B: Hot-reload during development
```bash
npm run dev
```

The server speaks MCP over **stdio**; VS Code will connect to it using the config below.

---

## 🧩 Connect to VS Code Copilot

Create a file at **`.vscode/mcp.json`**:

```json
{
  "servers": {
    "gmail-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "GMAIL_CREDENTIALS_PATH": "${workspaceFolder}/credentials.json",
        "GMAIL_TOKEN_PATH": "${workspaceFolder}/token.json",
        "TZ": "Asia/Karachi"
      }
    }
  }
}
```

Then in VS Code:
1. Open the folder of this project.  
2. Open **Copilot Chat**.  
3. Click the **Tools** (MCP) gear and ensure **gmail-mcp** is detected/started.

---

## 💡 Example Prompts in Copilot

- “Use my Gmail tool to **send an email** to `friend@example.com` with subject *Hello* and body *Just testing!*.”  
- “**List** my latest **5** emails from `from:google`.”  
- “**Read** the 2nd email on the list”/“**Read** the email with id `<paste-id>`”  
- “How many emails did I get **today**?”  
- “**Summarize** the 3rd email on the list”

---

## 📂 Project Structure

```
gmail-mcp-server/
├─ .vscode/
│  └─ mcp.json                # VS Code MCP wiring
├─ scripts/
│  └─ authorize.ts            # One-time OAuth to create token.json
├─ src/
│  ├─ gmail.ts                # Gmail API helpers (send/list/read/count/summarize fallback)
│  └─ index.ts                # MCP server exposing tools
├─ .env                       # Optional env vars (e.g., TZ); ignored by git
├─ credentials.json           # OAuth client (DO NOT COMMIT)
├─ token.json                 # OAuth token (DO NOT COMMIT)
├─ package.json               # Scripts & deps
├─ tsconfig.json              # TypeScript config
└─ .gitignore                 # Protects secrets & build artifacts
```

---

## 🔒 Security Notes
- **Never commit** `credentials.json` or `token.json`.  
- Keep the repo **private** if this is tied to your personal Gmail.  
- If you lose access to the machine/repo, revoke the app in Google: **myaccount.google.com/permissions**.

---

## 🧱 .gitignore (recommended)

```gitignore
# Node
node_modules/
dist/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env & Secrets
.env
credentials.json
token.json
```

---

## 📜 License
MIT © 2025 MAZHAR MOHYUDIN
