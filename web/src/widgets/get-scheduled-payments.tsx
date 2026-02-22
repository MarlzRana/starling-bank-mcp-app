import "@/index.css";
import { useState, useEffect, useRef } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

// ── Shared types ──────────────────────────────────────

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface Mandate {
  uid: string;
  reference?: string;
  status: string;
  source: string;
  created?: string;
  cancelled?: string;
  originatorName?: string;
  originatorUid?: string;
  accountUid?: string;
  lastPayment?: {
    lastDate?: string;
    lastAmount?: MinorUnitsAmount;
  };
  nextPayment?: {
    nextDate?: string;
    nextAmount?: MinorUnitsAmount;
  };
  [key: string]: unknown;
}

interface AccountInfo {
  accountUid: string;
  name: string;
  accountType: string;
  currency: string;
}

interface RecurrenceRule {
  startDate: string;
  frequency: string;
  interval?: number;
  count?: number;
  untilDate?: string;
  days?: string[];
}

interface RecurringTransfer {
  transferUid: string;
  recurrenceRule: RecurrenceRule;
  currencyAndAmount: MinorUnitsAmount;
  nextPaymentDate?: string;
  reference?: string;
}

interface Space {
  savingsGoalUid: string;
  name: string;
  state: string;
  totalSaved: MinorUnitsAmount;
  target?: MinorUnitsAmount;
  savedPercentage?: number;
}

interface SpaceAccount {
  accountUid: string;
  name: string;
  currency: string;
  accountType: string;
  spaces: Space[];
}

interface StandingOrder {
  paymentOrderUid?: string;
  amount?: MinorUnitsAmount;
  reference?: string;
  payeeUid?: string;
  payeeName?: string;
  nextDate?: string;
  frequency?: string;
  recurrenceRule?: RecurrenceRule;
  standingOrderRecurrence?: RecurrenceRule;
  cancelledAt?: string;
  [key: string]: unknown;
}

// ── Utility functions ─────────────────────────────────

function formatAmount(currency: string, minorUnits: number): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

function statusClass(status: string): string {
  switch (status) {
    case "LIVE":
      return "mandate-status mandate-status--live";
    case "CANCELLED":
      return "mandate-status mandate-status--cancelled";
    default:
      return "mandate-status mandate-status--pending";
  }
}

function describeFrequency(rule: RecurrenceRule): string {
  const interval = rule.interval ?? 1;
  const freq = rule.frequency;
  if (interval === 1) {
    switch (freq) {
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return rule.days?.length
          ? `Weekly on ${rule.days.map((d) => d.charAt(0) + d.slice(1).toLowerCase()).join(", ")}`
          : "Weekly";
      case "MONTHLY":
        return "Monthly";
      case "YEARLY":
        return "Yearly";
      default:
        return freq;
    }
  }
  switch (freq) {
    case "DAILY":
      return `Every ${interval} days`;
    case "WEEKLY":
      return `Every ${interval} weeks`;
    case "MONTHLY":
      return `Every ${interval} months`;
    case "YEARLY":
      return `Every ${interval} years`;
    default:
      return `Every ${interval} ${freq.toLowerCase()}`;
  }
}

// ── Collapsible Section ───────────────────────────────

function Section({
  title,
  count,
  loading,
  children,
}: {
  title: string;
  count: number | null;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const hasItems = count !== null && count > 0;
  const [expanded, setExpanded] = useState(hasItems);
  const prevCount = useRef(count);

  useEffect(() => {
    if (prevCount.current === null && count !== null) {
      setExpanded(count > 0);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <div>
      <div
        className="sp-section-header"
        onClick={() => setExpanded((e) => !e)}
      >
        <svg
          className={`sp-section-header__chevron${expanded ? " sp-section-header__chevron--expanded" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="sp-section-header__title">{title}</span>
        {count !== null && (
          <span className="sp-section-header__count">{count}</span>
        )}
        {loading && <span className="payee-spinner" />}
      </div>
      <div
        className={`sp-section-content${expanded ? " sp-section-content--expanded" : ""}`}
      >
        <div className="sp-section-content__inner">{children}</div>
      </div>
    </div>
  );
}

// ── Card Components ───────────────────────────────────

function DirectDebitCard({
  mandate,
  index,
}: {
  mandate: Mandate;
  index: number;
}) {
  const name = mandate.originatorName ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const lastAmt = mandate.lastPayment?.lastAmount;
  const lastDate = mandate.lastPayment?.lastDate;
  const nextDate = mandate.nextPayment?.nextDate;

  return (
    <div className="sp-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="sp-card__row">
        <div className="payee-avatar-initials">{initial}</div>
        <div className="sp-card__info">
          <span className="sp-card__name">{name}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.1rem" }}>
            <span className={statusClass(mandate.status)}>
              {mandate.status}
            </span>
            <span className="mandate-source">{mandate.source}</span>
          </div>
        </div>
        {lastAmt && (
          <span className="sp-card__amount">
            {formatAmount(lastAmt.currency, lastAmt.minorUnits)}
          </span>
        )}
      </div>
      <div className="sp-card__details">
        {lastDate && (
          <span className="sp-card__detail-item">
            Last: {formatDate(lastDate)}
          </span>
        )}
        {nextDate && (
          <span className="sp-card__detail-item">
            Next: {formatDate(nextDate)}
          </span>
        )}
        {mandate.reference && (
          <span className="sp-card__detail-item">
            Ref: {mandate.reference}
          </span>
        )}
      </div>
    </div>
  );
}

function StandingOrderCard({
  order,
  index,
}: {
  order: StandingOrder;
  index: number;
}) {
  const name = order.payeeName ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const rule =
    order.recurrenceRule ?? order.standingOrderRecurrence ?? null;

  return (
    <div className="sp-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="sp-card__row">
        <div className="payee-avatar-initials">{initial}</div>
        <div className="sp-card__info">
          <span className="sp-card__name">{name}</span>
          {rule && (
            <span className="sp-card__frequency">
              {describeFrequency(rule)}
            </span>
          )}
        </div>
        {order.amount && (
          <span className="sp-card__amount">
            {formatAmount(order.amount.currency, order.amount.minorUnits)}
          </span>
        )}
      </div>
      <div className="sp-card__details">
        {order.nextDate && (
          <span className="sp-card__detail-item">
            Next: {formatDate(order.nextDate)}
          </span>
        )}
        {order.reference && (
          <span className="sp-card__detail-item">
            Ref: {order.reference}
          </span>
        )}
        {order.cancelledAt && (
          <span className="sp-card__detail-item">
            Cancelled: {formatDate(order.cancelledAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function SpaceTransferCard({
  space,
  transfer,
  index,
}: {
  space: Space;
  transfer: RecurringTransfer;
  index: number;
}) {
  const initial = space.name[0]?.toUpperCase() ?? "?";

  return (
    <div className="sp-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="sp-card__row">
        <div className="payee-avatar-initials">{initial}</div>
        <div className="sp-card__info">
          <span className="sp-card__name">{space.name}</span>
          <span className="sp-card__frequency">
            {describeFrequency(transfer.recurrenceRule)}
          </span>
        </div>
        <span className="sp-card__amount">
          {formatAmount(
            transfer.currencyAndAmount.currency,
            transfer.currencyAndAmount.minorUnits
          )}
        </span>
      </div>
      <div className="sp-card__details">
        {transfer.nextPaymentDate && (
          <span className="sp-card__detail-item">
            Next: {formatDate(transfer.nextPaymentDate)}
          </span>
        )}
        <span className="sp-card__detail-item">
          Started: {formatDate(transfer.recurrenceRule.startDate)}
        </span>
        {transfer.reference && (
          <span className="sp-card__detail-item">
            Ref: {transfer.reference}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────

function GetScheduledPayments() {
  const { output } = useToolInfo<"get-scheduled-payments">();

  // Account info
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const { callToolAsync: fetchAccounts } = useCallTool("get-accounts");

  // Standing orders
  const [standingOrders, setStandingOrders] = useState<StandingOrder[]>([]);
  const [standingOrdersLoading, setStandingOrdersLoading] = useState(true);
  const { callToolAsync: fetchPayees } = useCallTool("get-payees");
  const { callToolAsync: fetchPayeeScheduled } = useCallTool(
    "get-payee-scheduled-payments"
  );

  // Space transfers
  const [spaceTransfers, setSpaceTransfers] = useState<
    { space: Space; transfer: RecurringTransfer }[]
  >([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const { callToolAsync: fetchSpaces } = useCallTool("get-spaces");

  const accountUid = output?.accountUid as string | undefined;

  // Guard against React Strict Mode double-invocation — the stdio transport
  // cannot handle concurrent requests, so we must ensure only one chain runs.
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!accountUid || fetchingRef.current) return;
    fetchingRef.current = true;

    (async () => {
      // 1. Fetch account info
      try {
        const result = await fetchAccounts({});
        const sc = result?.structuredContent as
          | { accounts?: AccountInfo[] }
          | undefined;
        if (sc?.accounts) {
          const found = sc.accounts.find((a) => a.accountUid === accountUid);
          if (found) setAccountInfo(found);
        }
      } catch {}

      // 2. Fetch standing orders via payees (sequentially per payee)
      try {
        const payeesResult = await fetchPayees({});
        const sc = payeesResult?.structuredContent as
          | { payees?: { payeeUid: string; payeeName: string }[] }
          | undefined;
        const payees = sc?.payees ?? [];

        const allOrders: StandingOrder[] = [];
        for (const payee of payees) {
          try {
            const res = await fetchPayeeScheduled({
              payeeUid: payee.payeeUid,
            });
            const spSc = res?.structuredContent as
              | {
                  payeeName?: string;
                  accountScheduledPayments?: {
                    account: { payeeAccountUid: string; description: string };
                    scheduledPayments: StandingOrder[];
                  }[];
                }
              | undefined;
            const name = spSc?.payeeName ?? payee.payeeName;
            const accountPayments = spSc?.accountScheduledPayments ?? [];
            for (const ap of accountPayments) {
              for (const sp of ap.scheduledPayments) {
                allOrders.push({
                  ...sp,
                  payeeName: sp.payeeName ?? name,
                  payeeUid: sp.payeeUid ?? payee.payeeUid,
                });
              }
            }
          } catch {}
        }
        setStandingOrders(allOrders);
        setStandingOrdersLoading(false);
      } catch {
        setStandingOrdersLoading(false);
      }

      // 3. Fetch space transfers
      try {
        const result = await fetchSpaces({});
        const sc = result?.structuredContent as
          | {
              accounts?: SpaceAccount[];
              recurringTransfers?: Record<string, RecurringTransfer>;
            }
          | undefined;
        const accounts = sc?.accounts ?? [];
        const transfers = sc?.recurringTransfers ?? {};

        const matchingAccount = accounts.find(
          (a) => a.accountUid === accountUid
        );
        const items: { space: Space; transfer: RecurringTransfer }[] = [];
        if (matchingAccount) {
          for (const space of matchingAccount.spaces) {
            const transfer = transfers[space.savingsGoalUid];
            if (transfer) {
              items.push({ space, transfer });
            }
          }
        }
        setSpaceTransfers(items);
        setSpacesLoading(false);
      } catch {
        setSpacesLoading(false);
      }
    })();
  }, [accountUid]);

  if (!output) {
    return (
      <div className="sp-container">
        <div className="sp-section-loading">Loading scheduled payments...</div>
      </div>
    );
  }

  const mandates: Mandate[] = (output.mandates as Mandate[]) ?? [];

  return (
    <div className="sp-container">
      {/* Account Banner */}
      {accountInfo && (
        <div className="sp-account-banner">
          <span className="sp-account-banner__name">{accountInfo.name}</span>
          <span className="account-type-badge">
            {accountInfo.accountType.replace(/_/g, " ")}
          </span>
          <span className="account-currency">{accountInfo.currency}</span>
        </div>
      )}

      <div className="payees-header">
        <span className="payees-header__title">Scheduled Payments</span>
      </div>

      {/* Direct Debits */}
      <Section title="Direct Debits" count={mandates.length}>
        {mandates.length === 0 ? (
          <div className="sp-section-empty">No active direct debits</div>
        ) : (
          mandates.map((mandate, i) => (
            <DirectDebitCard
              key={mandate.uid}
              mandate={mandate}
              index={i}
            />
          ))
        )}
      </Section>

      {/* Standing Orders */}
      <Section
        title="Standing Orders"
        count={standingOrdersLoading ? null : standingOrders.length}
        loading={standingOrdersLoading}
      >
        {standingOrdersLoading ? (
          <div className="sp-section-loading">Loading standing orders...</div>
        ) : standingOrders.length === 0 ? (
          <div className="sp-section-empty">No standing orders found</div>
        ) : (
          standingOrders.map((order, i) => (
            <StandingOrderCard
              key={order.paymentOrderUid ?? i}
              order={order}
              index={i}
            />
          ))
        )}
      </Section>

      {/* Space Transfers */}
      <Section
        title="Space Transfers"
        count={spacesLoading ? null : spaceTransfers.length}
        loading={spacesLoading}
      >
        {spacesLoading ? (
          <div className="sp-section-loading">
            Loading space transfers...
          </div>
        ) : spaceTransfers.length === 0 ? (
          <div className="sp-section-empty">
            No recurring space transfers
          </div>
        ) : (
          spaceTransfers.map(({ space, transfer }, i) => (
            <SpaceTransferCard
              key={transfer.transferUid}
              space={space}
              transfer={transfer}
              index={i}
            />
          ))
        )}
      </Section>
    </div>
  );
}

export default GetScheduledPayments;
mountWidget(<GetScheduledPayments />);
