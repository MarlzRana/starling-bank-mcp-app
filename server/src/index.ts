import { loadEnvFile } from 'node:process';
import { McpServer } from 'skybridge/server';
import { z } from 'zod';

loadEnvFile();

const BEARER_TOKEN = process.env.BEARER_TOKEN;
const STARLING_API_BASE_URL = process.env.STARLING_API_BASE_URL;

if (!BEARER_TOKEN) {
  throw new Error('BEARER_TOKEN environment variable is required');
}
if (!STARLING_API_BASE_URL) {
  throw new Error('STARLING_API_BASE_URL environment variable is required');
}

const authHeaders = {
  Authorization: `Bearer ${BEARER_TOKEN}`,
  Accept: 'application/json',
} as const;

const server = new McpServer(
  { name: 'alpic-openai-app', version: '0.0.1' },
  { capabilities: {} },
)
  .registerWidget(
    'get-accounts',
    { description: 'Starling Bank Accounts' },
    {
      description:
        'Fetch all Starling Bank accounts with balances and identifiers.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const [accountsRes, holderNameRes] = await Promise.all([
          fetch(`${STARLING_API_BASE_URL}/api/v2/accounts`, {
            headers: authHeaders,
          }),
          fetch(`${STARLING_API_BASE_URL}/api/v2/account-holder/name`, {
            headers: authHeaders,
          }),
        ]);

        if (!accountsRes.ok) {
          throw new Error(
            `Failed to fetch accounts: ${accountsRes.status} ${accountsRes.statusText}`,
          );
        }
        const accountsData = await accountsRes.json();
        const rawAccounts: Array<{
          accountUid: string;
          name: string;
          accountType: string;
          currency: string;
          createdAt: string;
        }> = accountsData.accounts ?? [];

        let accountHolderName: string | undefined;
        if (holderNameRes.ok) {
          const holderData = await holderNameRes.json();
          accountHolderName = holderData.accountHolderName;
        }

        const enriched = await Promise.all(
          rawAccounts.map(async (account) => {
            const [balanceRes, identifiersRes] = await Promise.all([
              fetch(
                `${STARLING_API_BASE_URL}/api/v2/accounts/${account.accountUid}/balance`,
                { headers: authHeaders },
              ),
              fetch(
                `${STARLING_API_BASE_URL}/api/v2/accounts/${account.accountUid}/identifiers`,
                { headers: authHeaders },
              ),
            ]);

            if (!balanceRes.ok) {
              throw new Error(
                `Failed to fetch balance for ${account.accountUid}: ${balanceRes.status}`,
              );
            }
            if (!identifiersRes.ok) {
              throw new Error(
                `Failed to fetch identifiers for ${account.accountUid}: ${identifiersRes.status}`,
              );
            }

            const balance = await balanceRes.json();
            const identifiersData = await identifiersRes.json();

            return {
              ...account,
              balance: {
                clearedBalance: balance.clearedBalance,
                effectiveBalance: balance.effectiveBalance,
                pendingTransactions: balance.pendingTransactions,
                totalClearedBalance: balance.totalClearedBalance,
                totalEffectiveBalance: balance.totalEffectiveBalance,
              },
              identifiers: identifiersData.accountIdentifiers ?? [],
            };
          }),
        );

        const result = { accountHolderName, accounts: enriched };

        return {
          structuredContent: result,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-cards',
    { description: 'Starling Bank Cards' },
    {
      description:
        'Fetch all cards for the account holder with their current controls.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const res = await fetch(`${STARLING_API_BASE_URL}/api/v2/cards`, {
          headers: authHeaders,
        });
        if (!res.ok) {
          throw new Error(
            `Failed to fetch cards: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json();
        const cards = data.cards ?? [];

        return {
          structuredContent: { cards },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ cards }, null, 2),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerTool(
    'update-card-control',
    {
      description:
        'Enable or disable a card control (ATM, online, POS, mag stripe, mobile wallet, card lock)',
      inputSchema: {
        cardUid: z.string().uuid().describe('The card UID'),
        control: z
          .enum([
            'atm-enabled',
            'enabled',
            'mag-stripe-enabled',
            'mobile-wallet-enabled',
            'online-enabled',
            'pos-enabled',
          ])
          .describe('The control to update'),
        value: z.boolean().describe('true to enable, false to disable'),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ cardUid, control, value }) => {
      try {
        const res = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/cards/${cardUid}/controls/${control}`,
          {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: value }),
          },
        );

        if (!res.ok) {
          throw new Error(
            `Failed to update ${control}: ${res.status} ${res.statusText}`,
          );
        }

        return {
          structuredContent: { success: true, cardUid, control, value },
          content: [
            {
              type: 'text' as const,
              text: `Card control "${control}" ${value ? 'enabled' : 'disabled'} successfully.`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'display-create-payee',
    { description: 'Create Payee Form' },
    {
      description:
        'IMMEDIATELY call this tool when the user wants to create or add a payee — do not ask questions first, show the form right away. ' +
        'Pre-fill any fields you already know from the conversation. All parameters are optional; the user completes the rest in the form UI. ' +
        'Do NOT call create-payee directly — it is an internal tool used by this form. ' +
        'After the user submits, you will receive a follow-up message confirming 2FA was triggered on their device.',
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
  .registerWidget(
    'create-payee',
    { description: 'Create a new payee' },
    {
      description:
        'INTERNAL — do NOT call this tool directly. It is used internally by the display-create-payee form widget. ' +
        'To create a payee, call display-create-payee instead.',
      _meta: { ui: { visibility: ['app'] } },
      inputSchema: {
        payeeName: z.string().describe('The name for the payee'),
        payeeType: z
          .enum(['BUSINESS', 'INDIVIDUAL'])
          .describe('Type of payee'),
        phoneNumber: z.string().optional().describe('Phone number'),
        firstName: z
          .string()
          .optional()
          .describe('First name (for INDIVIDUAL)'),
        middleName: z
          .string()
          .optional()
          .describe('Middle name (for INDIVIDUAL)'),
        lastName: z
          .string()
          .optional()
          .describe('Last name (for INDIVIDUAL)'),
        businessName: z
          .string()
          .optional()
          .describe('Business name (for BUSINESS)'),
        dateOfBirth: z
          .string()
          .optional()
          .describe('Date of birth (YYYY-MM-DD)'),
        accounts: z
          .array(
            z.object({
              description: z.string().describe('Account description'),
              defaultAccount: z
                .boolean()
                .describe('Whether this is the default account'),
              countryCode: z.string().describe('Country code (e.g. GB)'),
              accountIdentifier: z.string().describe('Account number'),
              bankIdentifier: z
                .string()
                .describe('Sort code or bank identifier'),
              bankIdentifierType: z
                .enum([
                  'SORT_CODE',
                  'SWIFT',
                  'IBAN',
                  'ABA',
                  'ABA_WIRE',
                  'ABA_ACH',
                ])
                .describe('Type of bank identifier'),
            }),
          )
          .min(1)
          .describe('At least one account'),
      },
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      try {
        const res = await fetch(`${STARLING_API_BASE_URL}/api/v2/payees`, {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ??
              `Failed to create payee: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json();
        return {
          structuredContent: {
            success: true,
            payeeUid: data.payeeUid,
            payeeName: input.payeeName,
          },
          content: [
            {
              type: 'text' as const,
              text: `Payee "${input.payeeName}" created successfully.`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'display-update-payee',
    { description: 'Update Payee Form' },
    {
      description:
        'IMMEDIATELY call this tool when the user wants to update or edit a payee — do not ask questions first, show the form right away. ' +
        'If you know the payeeUid, pass it to jump straight to the edit form. ' +
        'Pass any field values the user has already mentioned (e.g. firstName, phoneNumber) to pre-fill them in the form. ' +
        'Otherwise the user will pick from a list and fill in the form themselves. ' +
        'Do NOT call update-payee directly — it is an internal tool used by this form. ' +
        'After the user submits, you will receive a follow-up message confirming 2FA was triggered on their device.',
      inputSchema: {
        payeeUid: z.string().uuid().optional().describe('The payee UID to update (skips selector if provided)'),
        payeeName: z.string().optional().describe('Updated payee name'),
        payeeType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional().describe('Type of payee'),
        phoneNumber: z.string().optional().describe('Phone number'),
        firstName: z.string().optional().describe('First name (for INDIVIDUAL)'),
        middleName: z.string().optional().describe('Middle name (for INDIVIDUAL)'),
        lastName: z.string().optional().describe('Last name (for INDIVIDUAL)'),
        businessName: z.string().optional().describe('Business name (for BUSINESS)'),
        dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const payeesRes = await fetch(`${STARLING_API_BASE_URL}/api/v2/payees`, {
        headers: authHeaders,
      });
      if (!payeesRes.ok) {
        throw new Error(`Failed to fetch payees: ${payeesRes.status} ${payeesRes.statusText}`);
      }
      const payeesData = await payeesRes.json();
      const payees = payeesData.payees ?? [];

      const { payeeUid, ...overrides } = input;

      return {
        structuredContent: { payees, selectedPayeeUid: payeeUid ?? null, overrides },
        content: [{ type: 'text' as const, text: 'Update payee form displayed.' }],
        isError: false,
      };
    },
  )
  .registerWidget(
    'update-payee',
    { description: 'Update a payee' },
    {
      description:
        'INTERNAL — do NOT call this tool directly. It is used internally by the display-update-payee form widget. ' +
        'To update a payee, call display-update-payee instead.',
      _meta: { ui: { visibility: ['app'] } },
      inputSchema: {
        payeeUid: z.string().uuid().describe('The payee UID to update'),
        payeeName: z.string().describe('Updated payee name'),
        payeeType: z
          .enum(['BUSINESS', 'INDIVIDUAL'])
          .describe('Type of payee'),
        phoneNumber: z.string().optional().describe('Phone number'),
        firstName: z.string().optional().describe('First name'),
        middleName: z.string().optional().describe('Middle name'),
        lastName: z.string().optional().describe('Last name'),
        businessName: z.string().optional().describe('Business name'),
        dateOfBirth: z
          .string()
          .optional()
          .describe('Date of birth (YYYY-MM-DD)'),
      },
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      try {
        const { payeeUid, ...body } = input;
        const res = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees/${payeeUid}`,
          {
            method: 'PUT',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ??
              `Failed to update payee: ${res.status} ${res.statusText}`,
          );
        }
        return {
          structuredContent: {
            success: true,
            payeeUid,
            payeeName: input.payeeName,
          },
          content: [
            {
              type: 'text' as const,
              text: `Payee "${input.payeeName}" updated successfully.`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'delete-payee',
    { description: 'Delete a payee' },
    {
      description: 'Delete an existing payee permanently.',
      inputSchema: {
        payeeUid: z.string().uuid().describe('The payee UID to delete'),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (input) => {
      try {
        const listRes = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees`,
          {
            headers: authHeaders,
          },
        );
        if (!listRes.ok) {
          throw new Error(
            `Failed to fetch payees: ${listRes.status} ${listRes.statusText}`,
          );
        }
        const listData = await listRes.json();
        const deletedPayee = (listData.payees ?? []).find(
          (p: { payeeUid: string }) => p.payeeUid === input.payeeUid,
        );

        const res = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees/${input.payeeUid}`,
          {
            method: 'DELETE',
            headers: authHeaders,
          },
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ??
              `Failed to delete payee: ${res.status} ${res.statusText}`,
          );
        }
        return {
          structuredContent: {
            success: true,
            deletedPayee: deletedPayee ?? { payeeUid: input.payeeUid },
          },
          content: [
            {
              type: 'text' as const,
              text: `Payee deleted successfully.`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-payees',
    { description: 'Starling Bank Payees' },
    {
      description:
        'Fetch all Starling Bank payees with their account details and profile images.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const payeesRes = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees`,
          {
            headers: authHeaders,
          },
        );
        if (!payeesRes.ok) {
          throw new Error(
            `Failed to fetch payees: ${payeesRes.status} ${payeesRes.statusText}`,
          );
        }
        const payeesData = await payeesRes.json();
        const payees = payeesData.payees ?? [];

        const imageEntries = await Promise.all(
          payees.map(async (payee: { payeeUid: string }) => {
            try {
              const imgRes = await fetch(
                `${STARLING_API_BASE_URL}/api/v2/payees/${payee.payeeUid}/image`,
                { headers: { ...authHeaders, Accept: 'image/png' } },
              );
              if (!imgRes.ok) return [payee.payeeUid, null];
              const buffer = await imgRes.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              return [payee.payeeUid, `data:image/png;base64,${base64}`];
            } catch {
              return [payee.payeeUid, null];
            }
          }),
        );
        const images = Object.fromEntries(
          imageEntries.filter(([, uri]) => uri !== null),
        );

        return {
          structuredContent: { payees },
          _meta: { images },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ payees }, null, 2),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-payee-historic-payments',
    { description: 'Payee Historic Payments' },
    {
      description:
        'Fetch historic payments for a specific payee across all their accounts since a given date.',
      inputSchema: {
        payeeUid: z.string().uuid().describe('The payee UID'),
        since: z
          .string()
          .describe('Start date in YYYY-MM-DD format'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const payeeRes = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees/${input.payeeUid}`,
          { headers: authHeaders },
        );
        if (!payeeRes.ok) {
          throw new Error(
            `Failed to fetch payee: ${payeeRes.status} ${payeeRes.statusText}`,
          );
        }
        const payeeData = await payeeRes.json();
        const payeeName: string = payeeData.payeeName;
        const accounts: Array<{
          payeeAccountUid: string;
          description: string;
          accountIdentifier: string;
          bankIdentifier: string;
          bankIdentifierType: string;
          countryCode: string;
        }> = payeeData.accounts ?? [];

        const accountPayments = await Promise.all(
          accounts.map(async (account) => {
            const paymentsRes = await fetch(
              `${STARLING_API_BASE_URL}/api/v2/payees/${input.payeeUid}/account/${account.payeeAccountUid}/payments?since=${input.since}`,
              { headers: authHeaders },
            );
            if (!paymentsRes.ok) {
              return { account, payments: [] };
            }
            const paymentsData = await paymentsRes.json();
            return {
              account,
              payments: paymentsData.payments ?? [],
            };
          }),
        );

        return {
          structuredContent: {
            payeeUid: input.payeeUid,
            payeeName,
            since: input.since,
            accountPayments,
          },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { payeeUid: input.payeeUid, payeeName, since: input.since, accountPayments },
                null,
                2,
              ),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-payee-scheduled-payments',
    { description: 'Payee Scheduled Payments' },
    {
      description:
        'Fetch scheduled payments (standing orders, direct debits) for a specific payee across all their accounts.',
      inputSchema: {
        payeeUid: z.string().uuid().describe('The payee UID'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const payeeRes = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/payees/${input.payeeUid}`,
          { headers: authHeaders },
        );
        if (!payeeRes.ok) {
          throw new Error(
            `Failed to fetch payee: ${payeeRes.status} ${payeeRes.statusText}`,
          );
        }
        const payeeData = await payeeRes.json();
        const payeeName: string = payeeData.payeeName;
        const accounts: Array<{
          payeeAccountUid: string;
          description: string;
          accountIdentifier: string;
          bankIdentifier: string;
          bankIdentifierType: string;
          countryCode: string;
        }> = payeeData.accounts ?? [];

        const accountScheduledPayments = await Promise.all(
          accounts.map(async (account) => {
            const schedRes = await fetch(
              `${STARLING_API_BASE_URL}/api/v2/payees/${input.payeeUid}/account/${account.payeeAccountUid}/scheduled-payments`,
              { headers: authHeaders },
            );
            if (!schedRes.ok) {
              return { account, scheduledPayments: [] };
            }
            const schedData = await schedRes.json();
            return {
              account,
              scheduledPayments: schedData.scheduledPayments ?? [],
            };
          }),
        );

        return {
          structuredContent: {
            payeeUid: input.payeeUid,
            payeeName,
            accountScheduledPayments,
          },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { payeeUid: input.payeeUid, payeeName, accountScheduledPayments },
                null,
                2,
              ),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-space',
    { description: 'Starling Bank Space' },
    {
      description:
        'Fetch a single Starling Bank Space (savings goal) with its photo and data.',
      inputSchema: {
        accountUid: z.string().uuid().describe('The account UID'),
        spaceUid: z.string().uuid().describe('The space (savings goal) UID'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const [goalRes, photoRes] = await Promise.all([
          fetch(
            `${STARLING_API_BASE_URL}/api/v2/account/${input.accountUid}/savings-goals/${input.spaceUid}`,
            { headers: authHeaders },
          ),
          fetch(
            `${STARLING_API_BASE_URL}/api/v2/account/${input.accountUid}/savings-goals/${input.spaceUid}/photo`,
            { headers: { ...authHeaders, Accept: 'image/png' } },
          ).catch(() => null),
        ]);

        if (!goalRes.ok) {
          throw new Error(
            `Failed to fetch space: ${goalRes.status} ${goalRes.statusText}`,
          );
        }
        const goal = await goalRes.json();

        const images: Record<string, string> = {};
        if (photoRes && photoRes.ok) {
          try {
            const buffer = await photoRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            images[input.spaceUid] = `data:image/png;base64,${base64}`;
          } catch {
            // photo unavailable — ignore
          }
        }

        const result = { ...goal, accountUid: input.accountUid };

        return {
          structuredContent: result,
          _meta: { images },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'get-space-transactions',
    { description: 'Space Transactions' },
    {
      description:
        'Fetch transactions for a Starling Bank Space between now and 3 years ago.',
      inputSchema: {
        accountUid: z.string().uuid().describe('The account UID'),
        spaceUid: z
          .string()
          .uuid()
          .describe('The space UID (used as categoryUid)'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const now = new Date();
        const threeYearsAgo = new Date(now);
        threeYearsAgo.setFullYear(now.getFullYear() - 3);

        const params = new URLSearchParams({
          minTransactionTimestamp: threeYearsAgo.toISOString(),
          maxTransactionTimestamp: now.toISOString(),
        });

        const res = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/feed/account/${input.accountUid}/category/${input.spaceUid}/transactions-between?${params}`,
          { headers: authHeaders },
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch transactions: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json();
        const result = {
          feedItems: data.feedItems ?? [],
          accountUid: input.accountUid,
          spaceUid: input.spaceUid,
        };

        return {
          structuredContent: result,
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'create-space',
    { description: 'Create a Space' },
    {
      description:
        'INTERNAL — do NOT call this tool directly. It is used internally by the display-create-space form widget. ' +
        'To create a space, call display-create-space instead.',
      _meta: { ui: { visibility: ['app'] } },
      inputSchema: {
        accountUid: z.string().uuid().describe('The account UID'),
        name: z.string().describe('Name of the space'),
        currency: z
          .string()
          .length(3)
          .describe('ISO 4217 currency code (e.g. GBP)'),
        target: z
          .object({
            currency: z.string().length(3).describe('Currency code'),
            minorUnits: z.number().describe('Target amount in minor units'),
          })
          .optional()
          .describe('Optional savings target'),
        base64EncodedPhoto: z
          .string()
          .optional()
          .describe('Optional base64-encoded photo'),
      },
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      try {
        const body: Record<string, unknown> = {
          name: input.name,
          currency: input.currency,
        };
        if (input.target) body.target = input.target;
        if (input.base64EncodedPhoto)
          body.base64EncodedPhoto = input.base64EncodedPhoto;

        const res = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/account/${input.accountUid}/savings-goals`,
          {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ??
              `Failed to create space: ${res.status} ${res.statusText}`,
          );
        }
        const data = await res.json();

        return {
          structuredContent: {
            success: true,
            savingsGoalUid: data.savingsGoalUid,
            name: input.name,
            currency: input.currency,
            target: input.target,
          },
          content: [
            {
              type: 'text' as const,
              text: `Space "${input.name}" created successfully.`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerWidget(
    'display-create-space',
    { description: 'Create Space Form' },
    {
      description:
        'IMMEDIATELY call this tool when the user wants to create a Space (savings goal) — do not ask questions first, show the form right away. ' +
        'Pre-fill any fields you already know from the conversation. All parameters are optional; the user completes the rest in the form UI. ' +
        'Do NOT call create-space directly — it is an internal tool used by this form. ' +
        'After the user submits, you will receive a follow-up message confirming the space was created.',
      inputSchema: {
        name: z.string().optional().describe('Name of the space'),
        currency: z
          .string()
          .length(3)
          .optional()
          .describe('ISO 4217 currency code (e.g. GBP)'),
        targetMinorUnits: z
          .number()
          .optional()
          .describe('Optional target amount in minor units'),
        base64EncodedPhoto: z
          .string()
          .optional()
          .describe('Optional base64-encoded photo'),
      },
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      return {
        structuredContent: { prefill: input },
        content: [
          { type: 'text' as const, text: 'Create space form displayed.' },
        ],
        isError: false,
      };
    },
  );

server.run();

export type AppType = typeof server;
