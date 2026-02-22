Before writing code, first explore the project structure, then invoke the mcp-app-builder skill for documentation.

## Project Overview

This is a **Starling Bank MCP App** — an interactive MCP (Model Context Protocol) application that wraps the Starling Bank Public API and exposes it as rich, interactive widgets inside Claude Desktop (and other MCP hosts).

**Goal:** Expose Starling Bank account management features (accounts, cards, payees, transactions, etc.) as beautiful, interactive MCP widgets that feel like a native banking app inside Claude.

**Stack:**
- **Framework:** [Skybridge](https://docs.skybridge.tech/) — wraps MCP Apps, handles widget registration, dev server, and deployment
- **Server:** TypeScript, Node 24+, `@modelcontextprotocol/sdk`, Zod for input schemas
- **Frontend:** React 19, Vite, plain CSS (no component library)
- **Deployment:** [Alpic](https://alpic.ai/) — connect GitHub repo for auto-deploy

**Commands:**
```
npm run dev    # Start dev server at localhost:3000 + Skybridge DevTools UI
npm run build  # Build for production
npm run start  # Start production server
npm run deploy # Deploy to Alpic
```

**Environment variables (`.env`):**
- `BEARER_TOKEN` — Starling Bank personal access token
- `STARLING_API_BASE_URL` — e.g. `https://api.starlingbank.com`

## Project Structure

```
server/src/index.ts         # All MCP tools and widgets registered here
web/src/widgets/<name>.tsx  # React component for each widget (name must match exactly)
web/src/index.css           # All CSS — one file, organised by widget section
web/src/helpers.ts          # useToolInfo / useCallTool helpers (type-safe via AppType)
swagger.json                # Starling Bank Public API OpenAPI spec — source of truth for API shapes
```

## Starling Bank Public API Guidance

- Use `@swagger.json` to understand the Starling Bank Public API specifications.
- API base: `https://api.starlingbank.com/api/v2/`
- Auth: `Authorization: Bearer <token>` header on every request
- Amounts are always `{ currency: string, minorUnits: number }` — divide by 100 for display

**Key endpoints already used:**
- `GET /api/v2/accounts` — list accounts
- `GET /api/v2/account-holder/name` — account holder name
- `GET /api/v2/accounts/{accountUid}/balance` — balance
- `GET /api/v2/accounts/{accountUid}/identifiers` — sort code / IBAN etc.
- `GET /api/v2/cards` — list cards and their controls
- `PUT /api/v2/cards/{cardUid}/controls/{control}` — toggle a card control
- `GET /api/v2/payees` — list payees
- `PUT /api/v2/payees` — create payee
- `PUT /api/v2/payees/{payeeUid}` — update payee
- `DELETE /api/v2/payees/{payeeUid}` — delete payee
- `GET /api/v2/payees/{payeeUid}/image` — payee avatar (returns PNG)

## Implemented Widgets & Tools

| Name | Type | Description |
|------|------|-------------|
| `get-accounts` | widget | Accounts list with balances + identifiers |
| `get-cards` | widget | Card visual (flip animation) + toggle controls |
| `update-card-control` | tool (no UI) | Enable/disable ATM/online/POS/etc. |
| `get-payees` | widget | Payees list with avatars, expandable accounts |
| `display-create-payee` | widget | Create-payee form (pre-fillable) |
| `create-payee` | widget (app-only) | Internal — called by the form, hidden from model |
| `display-update-payee` | widget | Update-payee form with payee selector |
| `update-payee` | widget (app-only) | Internal — called by the form, hidden from model |
| `delete-payee` | widget | Delete a payee (with confirmation dialog) |

**Pattern for form widgets:** Use `display-<action>` as the model-visible tool that renders a form UI, and `<action>` as an app-only internal tool (`_meta: { ui: { visibility: ['app'] } }`) that the widget calls directly. This keeps internal API calls hidden from the model.

## Widget Development Patterns

**Registering a widget (server):**
```ts
server.registerWidget(
  'my-widget',                         // must match web/src/widgets/my-widget.tsx
  { description: 'Widget display name' },
  { description: '...tool description for the model...', inputSchema: { ... } },
  async (input) => ({
    structuredContent: { /* data for the React component */ },
    content: [{ type: 'text', text: 'Fallback text for non-UI hosts' }],
    isError: false,
  }),
)
```

**Consuming data in a widget (React):**
```tsx
import { useToolInfo, useCallTool } from '../helpers.js';

function MyWidget() {
  const { output } = useToolInfo<'my-widget'>(); // typed from AppType
  const callTool = useCallTool();
  // output is structuredContent from the server handler
}
```

## Tool UI Design Guidance

- Make sure to respect the color scheme.
- Design it to look good and visually appealing in Claude Desktop.
- Use animations to make the UI feel slick but not gimmicky — something professional.

**Color palette (defined in `web/src/index.css`):**
```css
--color-accent:           #cc785c  /* Antique Brass — primary accent, buttons, highlights */
--color-accent-light:     #d4896a  /* Card gradient start */
--color-accent-dark:      #b86448  /* Card gradient end */
--color-text:             #141413  /* Cod Gray — primary text */
--color-text-secondary:   #828179  /* Friar Gray — secondary/muted text */
--color-bg:               #f0efea  /* Cararra — page background */
--color-surface:          #ffffff  /* White — card/panel surface */
--color-toggle-off:       #d1cfc9  /* Toggle off state */
```

**Animation conventions:**
- Entry animations: `opacity: 0 → 1` + subtle `translateY(8px) → 0` (0.3s ease)
- Form slide-in: `translateX(16px) → 0` (0.25s ease)
- Card flip: `rotateY(180deg)` with `perspective: 1000px` (0.6s ease)
- Spinner: `rotate(360deg)` (0.6s linear infinite)
- Accordion: `max-height: 0 → 500px` (0.3s ease)

**Card visual:** The physical debit card is recreated with a gradient background, EMV chip SVG, contactless symbol, Mastercard circles, and a flip animation to reveal the card back with controls overlay.
