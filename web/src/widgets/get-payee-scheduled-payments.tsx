import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

interface PayeeAccount {
  payeeAccountUid: string;
  description: string;
  accountIdentifier: string;
  bankIdentifier: string;
  bankIdentifierType: string;
  countryCode: string;
}

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface RecurrenceRule {
  startDate: string;
  frequency: string;
  interval: number;
  count?: number;
  untilDate?: string;
}

interface ScheduledPayment {
  paymentOrderUid?: string;
  nextPaymentAmount?: MinorUnitsAmount;
  amount?: MinorUnitsAmount;
  reference?: string;
  recipientName?: string;
  recurrenceRule?: RecurrenceRule;
  startDate?: string;
  nextDate?: string;
  endDate?: string;
  paymentType?: string;
  spendingCategory?: string;
  [key: string]: unknown;
}

interface AccountScheduledPayments {
  account: PayeeAccount;
  scheduledPayments: ScheduledPayment[];
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

function formatRecurrence(rule: RecurrenceRule): string {
  const freqMap: Record<string, [string, string]> = {
    DAILY: ["day", "days"],
    WEEKLY: ["week", "weeks"],
    MONTHLY: ["month", "months"],
    YEARLY: ["year", "years"],
  };
  const entry = freqMap[rule.frequency];
  if (!entry) return rule.frequency;
  if (rule.interval === 1) return `Every ${entry[0]}`;
  return `Every ${rule.interval} ${entry[1]}`;
}

function ScheduledCard({
  payment,
  index,
}: {
  payment: ScheduledPayment;
  index: number;
}) {
  const amt = payment.nextPaymentAmount ?? payment.amount;

  return (
    <div
      className="scheduled-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="scheduled-card__top-row">
        {payment.paymentType && (
          <span className="scheduled-card__type-badge">
            {payment.paymentType.replace(/_/g, " ")}
          </span>
        )}
        {amt && (
          <span className="scheduled-card__amount">
            {formatAmount(amt.currency, amt.minorUnits)}
          </span>
        )}
      </div>
      {payment.reference && (
        <div className="scheduled-card__reference">{payment.reference}</div>
      )}
      {payment.recurrenceRule && (
        <div className="scheduled-card__recurrence">
          {formatRecurrence(payment.recurrenceRule)}
        </div>
      )}
      {(payment.nextDate || payment.startDate) && (
        <div className="scheduled-card__dates">
          {payment.nextDate && <span>Next: {formatDate(payment.nextDate)}</span>}
          {payment.startDate && (
            <span>
              {formatDate(payment.startDate)}
              {payment.endDate ? ` — ${formatDate(payment.endDate)}` : " — ongoing"}
            </span>
          )}
        </div>
      )}
      {payment.spendingCategory && (
        <span className="scheduled-card__category">
          {payment.spendingCategory.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}

function AccountSection({ entry }: { entry: AccountScheduledPayments }) {
  return (
    <div className="payments-account">
      <div className="payments-account__header">
        <span className="payments-account__desc">
          {entry.account.description}
        </span>
        <span className="payments-account__detail">
          {entry.account.bankIdentifier} / {entry.account.accountIdentifier}
        </span>
      </div>
      {(entry.scheduledPayments ?? []).length === 0 ? (
        <div className="payments-empty">
          No scheduled payments for this account
        </div>
      ) : (
        entry.scheduledPayments.map((sp, i) => (
          <ScheduledCard key={sp.paymentOrderUid ?? i} payment={sp} index={i} />
        ))
      )}
    </div>
  );
}

function GetPayeeScheduledPayments() {
  const { output } = useToolInfo<"get-payee-scheduled-payments">();

  if (!output) {
    return (
      <div className="payments-container">
        <div className="payments-loading">Loading scheduled payments...</div>
      </div>
    );
  }

  const { payeeName, accountScheduledPayments } = output as {
    payeeName: string;
    accountScheduledPayments: AccountScheduledPayments[];
  };

  const totalScheduled = (accountScheduledPayments ?? []).reduce(
    (sum, asp) => sum + (asp.scheduledPayments?.length ?? 0),
    0
  );

  return (
    <div className="payments-container">
      <div className="payments-header">
        <span className="payments-header__title">{payeeName}</span>
        <span className="payments-header__subtitle">
          {totalScheduled} scheduled payment{totalScheduled !== 1 ? "s" : ""}
        </span>
      </div>
      {(accountScheduledPayments ?? []).length === 0 ? (
        <div className="payments-empty">No accounts found for this payee</div>
      ) : (
        accountScheduledPayments.map((entry) => (
          <AccountSection
            key={entry.account.payeeAccountUid}
            entry={entry}
          />
        ))
      )}
    </div>
  );
}

export default GetPayeeScheduledPayments;
mountWidget(<GetPayeeScheduledPayments />);
