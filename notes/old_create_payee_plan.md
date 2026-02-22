# Display Create Payee — Form-First Tool Pattern

## Context

When a user says "create a payee", the LLM sees `create-payee` with a complex `inputSchema` and collects all fields conversationally before calling it. This is slow UX — the user wants to see a form immediately.

The fix: add a `display-create-payee` widget that the LLM calls right away (all params optional) to render the create form pre-filled with whatever info it has. The form submits via `useCallTool('create-payee')`. Meanwhile, `create-payee` becomes app-only (`visibility: ["app"]`) so the LLM can't call it directly.

After the form submits and 2FA is triggered, the widget sends a follow-up message via `useSendFollowUpMessage` (skybridge hook wrapping `ui/message`) to inform the model of the outcome. The spec only supports `role: "user"` — no system role available — but the message text makes it clear it's an automated UI notification.

## Architecture Flow

```
User: "Create a payee named John Smith"
  → LLM calls display-create-payee({ payeeName: "John Smith", payeeType: "INDIVIDUAL", ... })
  → Widget renders form pre-filled with provided data
  → User fills remaining fields, clicks "Create Payee"
  → Form calls create-payee (app-only) via useCallTool
  → Server hits Starling API → 2FA triggered on device
  → Widget shows "Requested you for confirmation on your device"
  → Widget sends ui/message via useSendFollowUpMessage to inform model
  → Model responds acknowledging the 2FA confirmation was sent
```

## Files to Modify

1. **`server/src/index.ts`** — Add `display-create-payee` widget, make `create-payee` app-only, update descriptions
2. **`web/src/widgets/display-create-payee.tsx`** — New file: form widget with pre-fill + follow-up message

## Server Changes (`server/src/index.ts`)

### Add `display-create-payee` (chain before `create-payee`)

```ts
.registerWidget(
  'display-create-payee',
  { description: 'Create Payee Form' },
  {
    description:
      'Display the create payee form UI. Always call this when the user wants to create a payee. ' +
      'Pre-fill any fields you already know — the user completes the rest in the form. ' +
      'Do NOT call create-payee directly; it is app-only and used by the form internally. ' +
      'After the user submits the form, you will receive a follow-up message confirming that 2FA was triggered on their device.',
    inputSchema: {
      payeeName: z.string().optional().describe('The name for the payee'),
      payeeType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional().describe('Type of payee'),
      phoneNumber: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name (for INDIVIDUAL)'),
      middleName: z.string().optional().describe('Middle name (for INDIVIDUAL)'),
      lastName: z.string().optional().describe('Last name (for INDIVIDUAL)'),
      businessName: z.string().optional().describe('Business name (for BUSINESS)'),
      dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      accounts: z.array(z.object({
        description: z.string(),
        defaultAccount: z.boolean(),
        countryCode: z.string(),
        accountIdentifier: z.string(),
        bankIdentifier: z.string(),
        bankIdentifierType: z.enum(['SORT_CODE', 'SWIFT', 'IBAN', 'ABA', 'ABA_WIRE', 'ABA_ACH']),
      })).optional().describe('Pre-filled account details'),
    },
    annotations: { readOnlyHint: true },
  },
  async (input) => {
    return {
      structuredContent: { prefill: input },
      content: [{ type: 'text' as const, text: 'Create payee form displayed.' }],
      isError: false,
    };
  },
)
```

### Modify `create-payee` — add app-only visibility + update description

Add to config object:

```ts
_meta: {
  ui: {
    visibility: ['app'];
  }
}
```

Update description to:

```
'App-only: Creates a payee via the Starling Bank API. Called by the create payee form UI — not by the model directly. Use display-create-payee to show the form instead.'
```

## Widget: `web/src/widgets/display-create-payee.tsx`

- Uses `useToolInfo<'display-create-payee'>()` to get `output.prefill` (the pre-filled partial data)
- Renders the same PayeeForm pattern from `get-payees.tsx` (copy inline — separate widget bundles can't share components)
- Pre-fills all form fields from `prefill` values, falling back to empty strings
- Pre-fills accounts array from `prefill.accounts` if provided, otherwise starts with 1 empty account
- Uses `useCallTool('create-payee')` to submit
- **On success**: shows "Requested you for confirmation on your device", then calls `useSendFollowUpMessage()` with a message like:
  `"[Create Payee Form] The user submitted the form and 2FA confirmation was requested on their device for payee '{payeeName}'."`
- No back button (standalone widget, not inside list view)
- Reuses all existing CSS classes (`.payee-form__*`, `.payee-accounts-form__*`, `.payee-form__submit*`, `.payee-spinner`, `.payees-container`)

### Follow-up message hook usage

```tsx
import { useSendFollowUpMessage } from 'skybridge/web';

// Inside the component:
const sendFollowUp = useSendFollowUpMessage();

// On create-payee success callback:
callCreate(data, {
  onSuccess: () => {
    sendFollowUp(
      `[Create Payee Form] The user submitted the create payee form and 2FA confirmation was requested on their device for payee "${payeeName}".`,
    );
  },
});
```

Note: `ui/message` only supports `role: "user"` per the spec — no system/assistant role available. The `[Create Payee Form]` prefix makes it clear this is an automated notification from the UI, not a user-typed message.

## No CSS Changes

All needed classes already exist in `web/src/index.css`.

## Verification

1. `npx tsc --noEmit` — no type errors
2. Say "create a payee" → LLM calls `display-create-payee` immediately → form appears with empty fields
3. Say "create a payee named John Smith, sort code 12-34-56, account 12345678" → form appears pre-filled
4. Fill remaining fields and submit → "Requested you for confirmation on your device" + model gets follow-up message
5. `create-payee` should NOT appear in the LLM's tool list (app-only)
6. The get-payees widget "+" button still works (calls `create-payee` via `useCallTool`)
