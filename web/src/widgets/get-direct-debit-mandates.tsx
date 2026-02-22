import "@/index.css";
import { useState, useEffect } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

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

interface Payment {
  paymentUid?: string;
  mandateUid?: string;
  amount?: MinorUnitsAmount;
  paymentAmount?: MinorUnitsAmount;
  reference?: string;
  paymentDate?: string;
  createdAt?: string;
  settlementDate?: string;
  [key: string]: unknown;
}

interface AccountInfo {
  accountUid: string;
  name: string;
  accountType: string;
  currency: string;
}

function formatAmount(currency: string, minorUnits: number): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(major);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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

function MandateCard({
  mandate,
  accountInfo,
  index,
  onHistory,
}: {
  mandate: Mandate;
  accountInfo?: AccountInfo;
  index: number;
  onHistory: () => void;
}) {
  const name = mandate.originatorName ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const lastAmt = mandate.lastPayment?.lastAmount;
  const lastDate = mandate.lastPayment?.lastDate;
  const nextDate = mandate.nextPayment?.nextDate;

  return (
    <div
      className="mandate-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="mandate-card__row">
        <div className="payee-avatar-initials">{initial}</div>
        <div className="mandate-card__info">
          <span className="mandate-card__originator">{name}</span>
          {mandate.reference && (
            <span className="mandate-card__reference">{mandate.reference}</span>
          )}
          <div className="mandate-card__meta">
            <span className={statusClass(mandate.status)}>
              {mandate.status}
            </span>
            <span className="mandate-source">{mandate.source}</span>
          </div>
        </div>
        <div className="mandate-card__actions">
          <button
            className="payee-action-btn"
            onClick={onHistory}
            title="Payment history"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mandate-card__details">
        {lastAmt && lastDate && (
          <span className="mandate-card__detail-item">
            Last: {formatAmount(lastAmt.currency, lastAmt.minorUnits)} on{" "}
            {formatDate(lastDate)}
          </span>
        )}
        {nextDate && (
          <span className="mandate-card__detail-item">
            Next: {formatDate(nextDate)}
          </span>
        )}
        {mandate.created && (
          <span className="mandate-card__detail-item">
            Created: {formatDate(mandate.created)}
          </span>
        )}
        {accountInfo && (
          <span className="mandate-card__detail-item">
            {accountInfo.name} &middot;{" "}
            {accountInfo.accountType.replace(/_/g, " ")}
          </span>
        )}
      </div>
    </div>
  );
}

function PaymentHistoryView({
  mandate,
  accountInfo,
  data,
  isPending,
  onBack,
}: {
  mandate: Mandate;
  accountInfo?: AccountInfo;
  data: { mandate: Mandate; payments: Payment[]; since: string } | null;
  isPending: boolean;
  onBack: () => void;
}) {
  const name = mandate.originatorName ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const payments = data?.payments ?? [];

  return (
    <div style={{ animation: "payee-view-enter 0.25s ease both", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <button className="payee-form__back" onClick={onBack}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="mandate-header">
        <div className="mandate-card__row" style={{ marginBottom: "0.5rem" }}>
          <div className="payee-avatar-initials">{initial}</div>
          <div className="mandate-card__info">
            <span className="mandate-card__originator">{name}</span>
            {mandate.reference && (
              <span className="mandate-card__reference">
                {mandate.reference}
              </span>
            )}
            <div className="mandate-card__meta">
              <span className={statusClass(mandate.status)}>
                {mandate.status}
              </span>
              {accountInfo && (
                <span className="mandate-source">
                  {accountInfo.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPending || !data ? (
        <div className="payments-loading">Loading payments...</div>
      ) : (
        <>
          <div className="mandate-payments-header">
            <span>
              {payments.length} payment{payments.length !== 1 ? "s" : ""}
            </span>
            {data?.since && (
              <span className="payments-header__badge">
                since {data.since.slice(0, 4)}
              </span>
            )}
          </div>
          {payments.length === 0 ? (
            <div className="payments-empty">No payments found</div>
          ) : (
            payments.map((payment, i) => {
              const amt = payment.paymentAmount ?? payment.amount;
              const dateStr =
                payment.paymentDate ??
                payment.createdAt ??
                payment.settlementDate;

              return (
                <div
                  key={payment.paymentUid ?? i}
                  className="mandate-payment-card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {amt && (
                    <div className="mandate-payment-card__amount">
                      {formatAmount(amt.currency, amt.minorUnits)}
                    </div>
                  )}
                  {payment.reference && (
                    <div className="payment-card__reference">
                      {payment.reference}
                    </div>
                  )}
                  {dateStr && (
                    <div className="mandate-payment-card__date">
                      {formatDateTime(dateStr)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

function GetDirectDebitMandates() {
  const { output } = useToolInfo<"get-direct-debit-mandates">();
  const [view, setView] = useState<"list" | "history">("list");
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);
  const [accounts, setAccounts] = useState<Map<string, AccountInfo>>(
    new Map()
  );
  const [historyData, setHistoryData] = useState<{
    mandate: Mandate;
    payments: Payment[];
    since: string;
  } | null>(null);
  const [historyPending, setHistoryPending] = useState(false);

  const { callToolAsync: fetchAccounts } = useCallTool("get-accounts");
  const { callToolAsync: fetchHistory } = useCallTool(
    "get-direct-debit-mandate-payment-history"
  );

  useEffect(() => {
    fetchAccounts({}).then((result) => {
      const sc = result?.structuredContent as {
        accounts?: AccountInfo[];
      } | undefined;
      if (sc?.accounts) {
        const map = new Map<string, AccountInfo>();
        for (const acc of sc.accounts) {
          map.set(acc.accountUid, acc);
        }
        setAccounts(map);
      }
    }).catch(() => {});
  }, []);

  const openHistory = async (mandate: Mandate) => {
    setSelectedMandate(mandate);
    setView("history");
    setHistoryData(null);
    setHistoryPending(true);
    try {
      const result = await fetchHistory({ mandateUid: mandate.uid });
      setHistoryData(
        (result?.structuredContent as unknown as {
          mandate: Mandate;
          payments: Payment[];
          since: string;
        }) ?? null
      );
    } catch {
      setHistoryData(null);
    } finally {
      setHistoryPending(false);
    }
  };

  if (!output) {
    return (
      <div className="mandate-container">
        <div className="payments-loading">Loading mandates...</div>
      </div>
    );
  }

  if (view === "history" && selectedMandate) {
    return (
      <div className="mandate-container">
        <PaymentHistoryView
          mandate={selectedMandate}
          accountInfo={
            selectedMandate.accountUid
              ? accounts.get(selectedMandate.accountUid)
              : undefined
          }
          data={historyData}
          isPending={historyPending}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  const mandates: Mandate[] = output.mandates ?? [];

  // Group mandates by accountUid
  const grouped = new Map<string, Mandate[]>();
  const ungrouped: Mandate[] = [];
  for (const m of mandates) {
    if (m.accountUid) {
      const list = grouped.get(m.accountUid) ?? [];
      list.push(m);
      grouped.set(m.accountUid, list);
    } else {
      ungrouped.push(m);
    }
  }

  return (
    <div className="mandate-container">
      <div className="payees-header">
        <span className="payees-header__title">Direct Debits</span>
      </div>

      {mandates.length === 0 ? (
        <div className="payees-empty">
          <span className="payees-empty__text">No direct debit mandates</span>
        </div>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([accountUid, group]) => {
            const info = accounts.get(accountUid);
            return (
              <div className="mandate-account-group" key={accountUid}>
                <div className="mandate-account-group__header">
                  <span className="spaces-account-group__name">
                    {info?.name ?? accountUid}
                  </span>
                  {info && (
                    <span className="spaces-account-group__type">
                      {info.accountType.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {group.map((mandate, i) => (
                  <MandateCard
                    key={mandate.uid}
                    mandate={mandate}
                    accountInfo={info}
                    index={i}
                    onHistory={() => openHistory(mandate)}
                  />
                ))}
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div className="mandate-account-group">
              {ungrouped.map((mandate, i) => (
                <MandateCard
                  key={mandate.uid}
                  mandate={mandate}
                  index={i}
                  onHistory={() => openHistory(mandate)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GetDirectDebitMandates;
mountWidget(<GetDirectDebitMandates />);
