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
        const accountsRes = await fetch(
          `${STARLING_API_BASE_URL}/api/v2/accounts`,
          { headers: authHeaders },
        );
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

        return {
          structuredContent: { accounts: enriched },
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ accounts: enriched }, null, 2),
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
        'Enable or disable a card control (ATM, online, POS, gambling, mag stripe, mobile wallet, card lock)',
      inputSchema: {
        cardUid: z.string().uuid().describe('The card UID'),
        control: z
          .enum([
            'atm-enabled',
            'enabled',
            'gambling-enabled',
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
  );

server.run();

export type AppType = typeof server;
