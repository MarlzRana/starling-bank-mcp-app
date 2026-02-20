import { McpServer } from 'skybridge/server';
import { z } from 'zod';

const BEARER_TOKEN =
  'eyJhbGciOiJQUzI1NiIsInppcCI6IkdaSVAifQ.H4sIAAAAAAAA_21TSY7jMAz8SsPnZiPel1vf5gPzAEqkE6FtyZDk9DQG8_eRIzuOg9xcVVyKIv03Uc4lXYKTAuLRfDiPdlD6LFB_fUgzJu-Jm0WIKAmLHEUOOWYpFLJuoJVZDlT1VdUKasqsD8H8Z0q6tK7T-lRVRf6eKPSRqLJTthAopZm1_2UGYvtb0Vqbs6yBIm0qKIq6AJFVDJSK_JRRi-WpCbW9-WIdMxpBUjRtCihSgqIULQimEhokWZy4zUosQkYY61NKdm7PkogMTdGErLpsoc36HCqBfRUaiZp4GViaiZdHiU7hcrMKGkfuLCO9PQn-Z3oSFLH2qldsj_ygnD8wKyCywWTHpPwdRMV7lJeR75E7_rbK8xvO_mKscmFloDSpq6IZhxgscEAtV2sSLYE02lszxEYLs2pG98qO6JXRYHroZ02rATk7b8ZtDh5RrdkjakLPHfHAwccGb2EjewwIOxngIm74ljnhD_MmRbAWiWAPAjXiea0Ztf0TvEXtUC6e7zQMRobp99qRALM8wzO7ZlnTq2FrFXsfqFuUZclq8gfgjlLch8NrWIWDs9l9HLh11AN3q_PIxOH68OwvSuzii1q7GIvKC9M8MEEYez8jx96HAedphRNuZxL-_3BF4ZiMpYf2R3bre2Rf5IP51nfe82IApLs-UxP1kXrc6W0Vz0tO_v0HQfs7aLIEAAA.ZORBPd5zQIikYawTPGeN0Spf9oiivU64qyiw6s3gG_gRmAI4ujk6TM1mgf0PonCUpgtW38_rDsebBy2iA1f1UvrQ82om5Vz5pvf7_ppys-7_OTelibkQCCr9F39nRTjvbg9g6O4bgTQJTdrJQVodUEatp_EJDDTjlAYrlMGaJCUWR3dH5IGVxQApkq4U0LL271PHS73xhNdBFffURmLABjYBzMkoesEYUkp7x2EBumc5ITHJCrJRnppQAhHeqdPiOCaXzHWfuW6Gam8M4fn6RmJjKbObCSUlY-FsyN3F_n7laRJl5Ep3pZXY68VTkrvyE931tWTAlq_qISRby6TTNQe0TVU7Fc89WkxJuYNakYNAknDpKugdiqKoX2F3ttUD-fSLgoEvY8ioeBkkDoUWPgDEPHiUaGzEpLe6ex2PcMpnxsDxXlxV_xA5j-IIvC6q9YgJL5JHviPu4F-OR3KvwDYQR6n07dK7QG-gPwMNuSoD-nX5CG-8U7hhjWUpp1bD1JjaplzFPllWa3jiLJkbtooA8CpvOV829afNn0rKY7U3OAaHWXlUgB5Y5Ov2I7F-u7-T-NIcbTd45qUrcpQkWB3A8aC2ibO8kf7Zr4NcjDqzXz5o2rDmbeJobASct4doa5cpVGtPAs838Gjd2jh9hxMFGL1mWIHbyIu_NX4SFyo';
const STARLING_API_BASE_URL = 'https://api-sandbox.starlingbank.com';

if (!BEARER_TOKEN) {
  throw new Error('BEARER_TOKEN environment variable is required');
}

const Answers = [
  'As I see it, yes',
  "Don't count on it",
  'It is certain',
  'It is decidedly so',
  'Most likely',
  'My reply is no',
  'My sources say no',
  'Outlook good',
  'Outlook not so good',
  'Signs point to yes',
  'Very doubtful',
  'Without a doubt',
  'Yes definitely',
  'Yes',
  'You may rely on it',
];

const server = new McpServer(
  {
    name: 'alpic-openai-app',
    version: '0.0.1',
  },
  { capabilities: {} },
).registerWidget(
  'magic-8-ball',
  {
    description: 'Magic 8 Ball',
  },
  {
    description: 'For fortune-telling or seeking advice.',
    inputSchema: {
      question: z.string().describe('The user question.'),
    },
  },
  async ({ question }) => {
    try {
      // deterministic answer
      const hash = question
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const answer = Answers[hash % Answers.length];
      return {
        structuredContent: { answer },
        content: [],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

server.registerWidget(
  'get-accounts',
  {
    description: 'Starling Bank Accounts',
    annotations: { readOnlyHint: true },
  },
  {
    description:
      'Fetch all Starling Bank accounts with balances and identifiers.',
  },
  async () => {
    try {
      const headers = {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Accept: 'application/json',
      };

      const accountsRes = await fetch(
        `${STARLING_API_BASE_URL}/api/v2/accounts`,
        { headers },
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
              { headers },
            ),
            fetch(
              `${STARLING_API_BASE_URL}/api/v2/accounts/${account.accountUid}/identifiers`,
              { headers },
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
            },
            identifiers: identifiersData.accountIdentifiers ?? [],
          };
        }),
      );

      const summary = enriched
        .map((a) => {
          const amount = a.balance.effectiveBalance;
          const formatted = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: amount.currency,
          }).format(amount.minorUnits / 100);
          return `${a.name} (${a.currency}) ${formatted}`;
        })
        .join(', ');

      return {
        structuredContent: { accounts: enriched },
        content: [
          {
            type: 'text' as const,
            text: `Found ${enriched.length} account${enriched.length !== 1 ? 's' : ''}: ${summary}`,
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
