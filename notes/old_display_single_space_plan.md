# Plan: Add Spaces (Savings Goals) Support

## Context

Users want to interact with their Starling Bank Spaces (savings goals) via the MCP app. A Space is a pot of money kept separate from the main balance. The Starling API calls these "savings goals" but the app uses "Space" terminology. A space UID = savings goal UID = category UID (for transactions).

## Tools to Build

| Tool                     | Type              | LLM-visible | Purpose                                                                                 |
| ------------------------ | ----------------- | ----------- | --------------------------------------------------------------------------------------- |
| `get-space`              | widget            | Yes         | Display a single space with photo, data, and transaction drill-down                     |
| `get-space-transactions` | widget            | Yes         | Display transactions for a space, with space info header (calls `get-space` internally) |
| `create-space`           | widget (app-only) | No          | Create a space via API (called by display-create-space widget)                          |
| `display-create-space`   | widget            | Yes         | Interactive form: account selector + space creation form                                |

## Files to Modify/Create

- **Modify:** `server/src/index.ts` — chain 4 new tool registrations before `server.run()` (line 753)
- **Create:** `web/src/widgets/get-space.tsx` — space detail + transactions drill-down
- **Create:** `web/src/widgets/get-space.css` — CSS for get-space + get-space-transactions (Team B)
- **Create:** `web/src/widgets/get-space-transactions.tsx` — standalone transactions view with space header
- **Create:** `web/src/widgets/create-space.tsx` — confirmation widget (follows `create-payee.tsx`)
- **Create:** `web/src/widgets/display-create-space.tsx` — account selector + space creation form
- **Create:** `web/src/widgets/display-create-space.css` — CSS for form + account selector (Team C)
- **Modify (final step):** `web/src/index.css` — consolidate all space CSS from separate files

## CSS Strategy

Each widget author creates their own CSS file alongside their widget (e.g., `web/src/widgets/get-space.css`) and imports it. This avoids merge conflicts between parallel team members. After all widgets are complete, a final consolidation step merges all space CSS into `web/src/index.css` and removes the separate files.

## Team Structure

### Team Member A: Server-side tool handlers (`server/src/index.ts`)

Chain all 4 tools after line 751, before `server.run()`:

**1. `get-space`** — `registerWidget`, `readOnlyHint: true`

- Input: `accountUid` (uuid), `spaceUid` (uuid)
- Handler: parallel fetch savings goal + photo, return goal data in `structuredContent`, photo in `_meta.images` (handle photo 404 gracefully)
- Pass `accountUid` through in structuredContent for widget's transaction calls

**2. `get-space-transactions`** — `registerWidget`, `readOnlyHint: true` (LLM-visible)

- Input: `accountUid` (uuid), `spaceUid` (uuid, used as categoryUid)
- Handler: fetch `GET /api/v2/feed/account/{accountUid}/category/{spaceUid}/transactions-between` with min=3 years ago, max=now
- Return `{ feedItems, accountUid, spaceUid }` in structuredContent (pass through IDs so widget can call `get-space`)
- Description: "Fetch transactions for a Starling Bank Space between now and 3 years ago."

**3. `create-space`** — `registerWidget`, visibility `['app']`, `readOnlyHint: false`

- Input: `accountUid` (uuid), `name` (string), `currency` (3-char), `target` (optional `{currency, minorUnits}`), `base64EncodedPhoto` (optional)
- Handler: `PUT /api/v2/account/{accountUid}/savings-goals` with body `{name, currency, target?, base64EncodedPhoto?}`
- Return `{success, savingsGoalUid, name, currency, target}` in structuredContent

**4. `display-create-space`** — `registerWidget`, `readOnlyHint: true`

- Input: all `create-space` params except `accountUid`, all optional (prefill)
- Handler: passthrough `{ prefill: input }` (same pattern as `display-create-payee`)
- Description instructs LLM to call this immediately, not `create-space`

**Reference:** Existing `display-create-payee`/`create-payee` pattern (lines 222-356)

### Team Member B: `get-space.tsx` + `get-space-transactions.tsx` widgets + CSS

**Owns CSS:** `web/src/widgets/get-space.css` (imported by both `get-space.tsx` and `get-space-transactions.tsx`)

- Space card styles: `.space-card`, `__photo`, `__header`, `__name`, `__state-badge`, `__amounts`, `__saved`, `__target`, `__progress`, `__progress-bar`, `__percentage`, `__actions`
- Transaction styles: `.space-transaction`, `__direction`, `__info`, `__reference`, `__date`, `__amount`
- Action button: `.space-action-btn`
- Container: `.space-container`, `.space-loading`
- Reuse existing: `payee-spinner`, `payee-form__back`, animation keyframes

**`get-space.tsx`** — space detail with transaction drill-down:

- Components: `GetSpace` → `SpaceCard` + `TransactionsView` → `TransactionCard`
- Use `useToolInfo<'get-space'>()` for space data, `responseMetadata.images` for photo
- SpaceCard: photo, name, state badge, total saved (large accent text), target + progress bar, "View Transactions" button
- TransactionsView: back button, transaction list fetched via `useCallTool('get-space-transactions')`
- TransactionCard: direction indicator (green IN / red OUT), amount, reference, date
- Helper: `formatAmount(currency, minorUnits)` using `Intl.NumberFormat`

**`get-space-transactions.tsx`** — standalone transactions widget (LLM-callable):

- Use `useToolInfo<'get-space-transactions'>()` for transaction data + `accountUid`/`spaceUid`
- Use `useCallTool('get-space')` to fetch space info (name, photo, etc.) for a header
- Show space info header (name, photo, total saved) at top, then transaction list below
- Reuse `TransactionCard` component (extract to shared or duplicate — keep it simple)

**Key references:**

- `web/src/widgets/get-payees.tsx` — images from `_meta`, sub-views, nested `useCallTool`
- `web/src/widgets/get-payee-historic-payments.tsx` — transaction rendering
- `web/src/widgets/get-cards.tsx` — `callToolAsync` pattern for fetching related data

### Team Member C: `display-create-space.tsx` + `create-space.tsx` widgets + CSS

**Owns CSS:** `web/src/widgets/display-create-space.css` (imported by both `display-create-space.tsx` and `create-space.tsx`)

- Form styles: `.space-form`, `__title`, `__group`, `__label`, `__input`, `__submit`, `__submit--success`
- Photo upload: `.space-form__photo-upload`, `__photo-preview`, `__photo-remove` (file input styled as button, thumbnail preview with remove option)
- Account selector: `.space-account-card`, `__info`, `__name`, `__balance`
- Reuse existing: `payee-spinner`, `payee-result__*`, `payee-form__back`, animation keyframes

**`display-create-space.tsx`** — multi-step form:

1. **Account selector**: fetch accounts via `callToolAsync` from `useCallTool('get-accounts')` (pattern from `get-cards.tsx` lines 164-195), render clickable account cards
2. **Space form**: name (required), currency (default from selected account), optional target toggle + amount input, **photo upload** (optional — file input that converts to base64 via `FileReader.readAsDataURL`, shows preview thumbnail, passed as `base64EncodedPhoto` to `create-space`)
3. **Submit**: call `create-space` via `useCallTool`, then `sendFollowUp()` on success
4. **Success state**: button changes to green "Space Created" (same pattern as display-create-payee submit button)

**`create-space.tsx`** — simple confirmation widget:

- Follows `create-payee.tsx` exactly (54 lines)
- Reuses `payee-result__*` CSS classes (from `index.css`, no new CSS needed)
- Shows success/error/loading states

**Key references:**

- `web/src/widgets/display-create-payee.tsx` — form with prefill, `useCallTool` submission
- `web/src/widgets/get-cards.tsx` lines 164-195 — `callToolAsync` for accounts
- `web/src/widgets/create-payee.tsx` — confirmation widget pattern

## Execution Order

**Phase 1:** Team A (server handlers) — must complete first so widget types resolve
**Phase 2 (parallel):** Team B (get-space + get-space-transactions + CSS) + Team C (display-create-space + create-space + CSS)
**Phase 3:** Consolidate separate CSS files into `web/src/index.css`, remove separate files

## Verification

1. Start dev server and verify tools appear in tool list
2. Test `get-space` with a valid account/space UUID — should show space card with photo and data
3. Click "View Transactions" in get-space — should fetch and display transaction history
4. Test `get-space-transactions` directly via LLM — should show space info header (fetched via get-space internally) + transaction list
5. Test `display-create-space` — should show account selector, then form after selection
6. Submit form — should call `create-space` API and show success confirmation
7. Verify LLM receives follow-up message after space creation
