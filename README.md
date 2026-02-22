> **Disclaimer:** This project is not affiliated with, endorsed by, or associated with Starling Bank in any way. It is an independent, open-source project that uses the [Starling Bank Public API](https://developer.starlingbank.com/). "Starling Bank" is a trademark of Starling Bank Limited.

# Starling Bank MCP App

A full-featured MCP app that brings Starling Bank account management into Claude, ChatGPT, and other MCP-compatible clients via interactive widgets. Built with [Skybridge](https://docs.skybridge.tech/) and React.

## Features

- **Accounts** — View accounts, balances, and identifiers
- **Cards** — Visual card display with flip animation; toggle controls (ATM, online, POS, mag stripe, mobile wallet, card lock)
- **Payees** — Create, view, update, and delete payees with profile images
- **Spaces (Savings Goals)** — Create, view, update, deposit, withdraw, and manage recurring transfers
- **Transactions** — Browse transaction history with spending analytics
- **Scheduled Payments** — View standing orders, direct debits, and space transfers
- **Direct Debits** — View mandates and payment history

## Getting Started

### Prerequisites

- Node.js 24+
- A [Starling Bank Developer](https://developer.starlingbank.com/) personal access token (sandbox or production)
- An HTTP tunnel such as [ngrok](https://ngrok.com/download) if testing with remote MCP hosts like ChatGPT or Claude.ai

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and fill in your values:

   ```
   BEARER_TOKEN=<Your Starling Bank API Token>
   STARLING_API_BASE_URL=https://api-sandbox.starlingbank.com
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   This starts:
   - The MCP server at `http://localhost:3000/mcp`
   - Skybridge DevTools UI at `http://localhost:3000/`

## Project Structure

```
├── server/
│   └── src/
│       └── index.ts          # All MCP tools and widget registrations
├── web/
│   └── src/
│       ├── widgets/          # React components (one per widget)
│       ├── components/       # Shared React components
│       ├── hooks/            # Custom React hooks
│       ├── assets/           # Images and icons
│       ├── helpers.ts        # Type-safe useToolInfo & useCallTool helpers
│       └── index.css         # Global styles
├── swagger.json              # Starling Bank API spec (reference)
├── alpic.json                # Deployment config
└── package.json
```

## Deployment

Deploy to any cloud platform that supports MCP, or use [Alpic](https://alpic.ai/) for one-click deploys:

1. Create an account on [Alpic](https://app.alpic.ai/).
2. Connect your GitHub repository to auto-deploy on each commit.
3. Use the remote URL to connect from any MCP client.

## Built With

- [Skybridge](https://docs.skybridge.tech/) — MCP app framework
- [React 19](https://react.dev/) + [Vite](https://vite.dev/) — Widget UI
- [Zod](https://zod.dev/) — Input validation
- [Starling Bank Public API](https://developer.starlingbank.com/) — Banking data

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Starling Bank API Documentation](https://developer.starlingbank.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
