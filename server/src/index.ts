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
    'create-payee',
    { description: 'Create a new payee' },
    {
      description:
        'Create a new payee with account details for payments.',
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
    'update-payee',
    { description: 'Update a payee' },
    {
      description: "Update an existing payee's details (not accounts).",
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
  );

server.run();

export type AppType = typeof server;
