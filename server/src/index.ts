import { McpServer } from 'skybridge/server';
import { z } from 'zod';

const BEARER_TOKEN =
  'eyJhbGciOiJQUzI1NiIsInppcCI6IkdaSVAifQ.H4sIAAAAAAAA_21TSY7jMAz8SsPnZiPel1vf5gPzAEqkE6FtyZDk9DQG8_eRIzuOg9xcVVyKIv03Uc4lXYKTAuLRfDiPdlD6LFB_fUgzJu-Jm0WIKAmLHEUOOWYpFLJuoJVZDlT1VdUKasqsD8H8Z0q6tK7T-lRVRf6eKPSRqLJTthAopZm1_2UGYvtb0Vqbs6yBIm0qKIq6AJFVDJSK_JRRi-WpCbW9-WIdMxpBUjRtCihSgqIULQimEhokWZy4zUosQkYY61NKdm7PkogMTdGErLpsoc36HCqBfRUaiZp4GViaiZdHiU7hcrMKGkfuLCO9PQn-Z3oSFLH2qldsj_ygnD8wKyCywWTHpPwdRMV7lJeR75E7_rbK8xvO_mKscmFloDSpq6IZhxgscEAtV2sSLYE02lszxEYLs2pG98qO6JXRYHroZ02rATk7b8ZtDh5RrdkjakLPHfHAwccGb2EjewwIOxngIm74ljnhD_MmRbAWiWAPAjXiea0Ztf0TvEXtUC6e7zQMRobp99qRALM8wzO7ZlnTq2FrFXsfqFuUZclq8gfgjlLch8NrWIWDs9l9HLh11AN3q_PIxOH68OwvSuzii1q7GIvKC9M8MEEYez8jx96HAedphRNuZxL-_3BF4ZiMpYf2R3bre2Rf5IP51nfe82IApLs-UxP1kXrc6W0Vz0tO_v0HQfs7aLIEAAA.ZORBPd5zQIikYawTPGeN0Spf9oiivU64qyiw6s3gG_gRmAI4ujk6TM1mgf0PonCUpgtW38_rDsebBy2iA1f1UvrQ82om5Vz5pvf7_ppys-7_OTelibkQCCr9F39nRTjvbg9g6O4bgTQJTdrJQVodUEatp_EJDDTjlAYrlMGaJCUWR3dH5IGVxQApkq4U0LL271PHS73xhNdBFffURmLABjYBzMkoesEYUkp7x2EBumc5ITHJCrJRnppQAhHeqdPiOCaXzHWfuW6Gam8M4fn6RmJjKbObCSUlY-FsyN3F_n7laRJl5Ep3pZXY68VTkrvyE931tWTAlq_qISRby6TTNQe0TVU7Fc89WkxJuYNakYNAknDpKugdiqKoX2F3ttUD-fSLgoEvY8ioeBkkDoUWPgDEPHiUaGzEpLe6ex2PcMpnxsDxXlxV_xA5j-IIvC6q9YgJL5JHviPu4F-OR3KvwDYQR6n07dK7QG-gPwMNuSoD-nX5CG-8U7hhjWUpp1bD1JjaplzFPllWa3jiLJkbtooA8CpvOV829afNn0rKY7U3OAaHWXlUgB5Y5Ov2I7F-u7-T-NIcbTd45qUrcpQkWB3A8aC2ibO8kf7Zr4NcjDqzXz5o2rDmbeJobASct4doa5cpVGtPAs838Gjd2jh9hxMFGL1mWIHbyIu_NX4SFyo';
const STARLING_API_BASE_URL = 'https://api-sandbox.starlingbank.com';

if (!BEARER_TOKEN) {
  throw new Error('BEARER_TOKEN environment variable is required');
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
      description: 'Fetch all Starling Bank accounts with balances and identifiers.',
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
      description: 'Fetch all cards for the account holder with their current controls.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const res = await fetch(`${STARLING_API_BASE_URL}/api/v2/cards`, {
          headers: authHeaders,
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch cards: ${res.status} ${res.statusText}`);
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
      description: 'Enable or disable a card control (ATM, online, POS, gambling, mag stripe, mobile wallet, card lock)',
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
