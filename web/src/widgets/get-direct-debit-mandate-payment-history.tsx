import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

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

function GetDirectDebitMandatePaymentHistory() {
  const { output } =
    useToolInfo<"get-direct-debit-mandate-payment-history">();

  if (!output) {
    return (
      <div className="mandate-container">
        <div className="payments-loading">Loading payment history...</div>
      </div>
    );
  }

  const { mandate, payments, since } = output as {
    mandate: Mandate;
    payments: Payment[];
    since: string;
  };

  const name = mandate?.originatorName ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const lastAmt = mandate?.lastPayment?.lastAmount;
  const lastDate = mandate?.lastPayment?.lastDate;

  return (
    <div className="mandate-container">
      <div className="mandate-header">
        <div className="mandate-card__row" style={{ marginBottom: "0.5rem" }}>
          <div className="payee-avatar-initials">{initial}</div>
          <div className="mandate-card__info">
            <span className="mandate-card__originator">{name}</span>
            {mandate?.reference && (
              <span className="mandate-card__reference">
                {mandate.reference}
              </span>
            )}
            <div className="mandate-card__meta">
              {mandate?.status && (
                <span className={statusClass(mandate.status)}>
                  {mandate.status}
                </span>
              )}
              {mandate?.source && (
                <span className="mandate-source">{mandate.source}</span>
              )}
            </div>
          </div>
        </div>
        {(lastAmt || lastDate || mandate?.created) && (
          <div className="mandate-card__details">
            {lastAmt && lastDate && (
              <span className="mandate-card__detail-item">
                Last: {formatAmount(lastAmt.currency, lastAmt.minorUnits)} on{" "}
                {formatDate(lastDate)}
              </span>
            )}
            {mandate?.created && (
              <span className="mandate-card__detail-item">
                Created: {formatDate(mandate.created)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mandate-payments-header">
        <span>
          {(payments ?? []).length} payment
          {(payments ?? []).length !== 1 ? "s" : ""}
        </span>
        {since && (
          <span className="payments-header__badge">
            since {since.slice(0, 4)}
          </span>
        )}
      </div>

      {(payments ?? []).length === 0 ? (
        <div className="payments-empty">No payments found</div>
      ) : (
        payments.map((payment, i) => {
          const amt = payment.paymentAmount ?? payment.amount;
          const dateStr =
            payment.paymentDate ?? payment.createdAt ?? payment.settlementDate;

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
    </div>
  );
}

export default GetDirectDebitMandatePaymentHistory;
mountWidget(<GetDirectDebitMandatePaymentHistory />);
