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

interface Payment {
  paymentUid: string;
  amount?: MinorUnitsAmount;
  paymentAmount?: MinorUnitsAmount;
  settlementAmount?: MinorUnitsAmount;
  reference?: string;
  createdAt?: string;
  settlementDate?: string;
  spendingCategory?: string;
  [key: string]: unknown;
}

interface AccountPayments {
  account: PayeeAccount;
  payments: Payment[];
}

function getAmount(payment: Payment): MinorUnitsAmount | null {
  return payment.amount ?? payment.paymentAmount ?? payment.settlementAmount ?? null;
}

function formatAmount(currency: string, minorUnits: number): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(major);
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function PaymentCard({ payment, index }: { payment: Payment; index: number }) {
  const amt = getAmount(payment);
  const dateStr = payment.createdAt ?? payment.settlementDate;

  return (
    <div
      className="payment-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {amt && (
        <div className="payment-card__amount">
          {formatAmount(amt.currency, amt.minorUnits)}
        </div>
      )}
      {payment.reference && (
        <div className="payment-card__reference">{payment.reference}</div>
      )}
      {dateStr && (
        <div className="payment-card__date">{formatDateTime(dateStr)}</div>
      )}
      {payment.spendingCategory && (
        <span className="payment-card__category">
          {payment.spendingCategory.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}

function AccountSection({ entry }: { entry: AccountPayments }) {
  return (
    <div className="payments-account">
      <div className="payments-account__header">
        <span className="payments-account__desc">{entry.account.description}</span>
        <span className="payments-account__detail">
          {entry.account.bankIdentifier} / {entry.account.accountIdentifier}
        </span>
      </div>
      {entry.payments.length === 0 ? (
        <div className="payments-empty">No payments found for this account</div>
      ) : (
        entry.payments.map((payment, i) => (
          <PaymentCard key={payment.paymentUid ?? i} payment={payment} index={i} />
        ))
      )}
    </div>
  );
}

function GetPayeeHistoricPayments() {
  const { output } = useToolInfo<"get-payee-historic-payments">();

  if (!output) {
    return (
      <div className="payments-container">
        <div className="payments-loading">Loading payments...</div>
      </div>
    );
  }

  const { payeeName, since, accountPayments } = output as {
    payeeName: string;
    since: string;
    accountPayments: AccountPayments[];
  };

  const totalPayments = (accountPayments ?? []).reduce(
    (sum, ap) => sum + (ap.payments?.length ?? 0),
    0
  );

  return (
    <div className="payments-container">
      <div className="payments-header">
        <span className="payments-header__title">{payeeName}</span>
        <span className="payments-header__subtitle">
          {totalPayments} payment{totalPayments !== 1 ? "s" : ""} since{" "}
          <span className="payments-header__badge">{since}</span>
        </span>
      </div>
      {(accountPayments ?? []).length === 0 ? (
        <div className="payments-empty">No accounts found for this payee</div>
      ) : (
        accountPayments.map((entry) => (
          <AccountSection
            key={entry.account.payeeAccountUid}
            entry={entry}
          />
        ))
      )}
    </div>
  );
}

export default GetPayeeHistoricPayments;
mountWidget(<GetPayeeHistoricPayments />);
