> **Disclaimer:** This project is not affiliated with, endorsed by, or associated with Starling Bank in any way. It is an independent, open-source project that uses the [Starling Bank Public API](https://developer.starlingbank.com/). "Starling Bank" is a trademark of Starling Bank Limited.

# Starling Bank MCP App

🏆 **2nd Place Winner at the Claude Code 1st Birthday Hackathon!** 🏆

A full-featured MCP app that brings Starling Bank account management into Claude, ChatGPT, and other MCP-compatible clients via interactive widgets. Built with [Skybridge](https://docs.skybridge.tech/) and React.

## Contributors
* [Marlin Ranasinghe (@MarlzRana)](https://github.com/MarlzRana)
* [Daniel Tsiang (@DanielTsiang)](https://github.com/DanielTsiang)

## Demos

### Demo 1: Account Details & Card Controls
This demo highlights essential everyday banking features. It shows how the app retrieves basic account information, e.g. your current balance, sort code, and account number. It then demonstrates the interactive card management UI, allowing users to toggle live security settings (such as disabling ATM withdrawals or mag-stripe payments) directly within the chat.

https://github.com/user-attachments/assets/1d61959a-35a0-4f09-9c2d-10109063473a

### Demo 2: Space Transfers
This video demonstrates the workflow for moving money into a Starling Saving Space. The agent generates a transfer ID and surfaces a form where the user can select a specific saving goal, enter an amount, and instantly execute the transfer.

https://github.com/user-attachments/assets/1af40a39-6269-4ff0-b0d1-86144efa8c25

### Demo 3: Interactive Spending Insights

This demo showcases the app's rich analytical capabilities. By simply asking for a spending overview, the app pulls your transaction history and renders an interactive dashboard. The UI visualizes spending trends over time and allows users to seamlessly filter and categorize their transactions by date, merchant, and category.

https://github.com/user-attachments/assets/21ec4ad9-9474-4f69-b44c-ee76801bd3b4

### Demo 4: Managing Scheduled Payments & Recurring Transfers
This demo showcases how the MCP app handles scheduled account activity. It demonstrates querying the user's upcoming payments (including Direct Debits and Space Transfers) and seamlessly guides the user through a UI form to set up a new monthly recurring transfer to a designated Starling Saving Space.

https://github.com/user-attachments/assets/efac0d28-7d9a-423f-b30a-738d9cfe03be

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
