import "@/index.css";
import { useState, useCallback } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";
import { usePayeeImage } from "../hooks/use-image.js";

interface PayeeAccount {
  payeeAccountUid: string;
  description: string;
  defaultAccount: boolean;
  countryCode: string;
  accountIdentifier: string;
  bankIdentifier: string;
  bankIdentifierType: string;
}

interface Payee {
  payeeUid: string;
  payeeName: string;
  payeeType: "BUSINESS" | "INDIVIDUAL";
  phoneNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: string;
  accounts: PayeeAccount[];
}

interface AccountFormData {
  description: string;
  countryCode: string;
  accountIdentifier: string;
  bankIdentifier: string;
  bankIdentifierType: string;
  defaultAccount: boolean;
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

function formatPaymentAmount(currency: string, minorUnits: number): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(major);
}

function formatPaymentDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatPaymentDate(iso: string): string {
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

function getPaymentAmount(payment: Payment): MinorUnitsAmount | null {
  return payment.amount ?? payment.paymentAmount ?? payment.settlementAmount ?? null;
}

const emptyAccount = (): AccountFormData => ({
  description: "",
  countryCode: "GB",
  accountIdentifier: "",
  bankIdentifier: "",
  bankIdentifierType: "SORT_CODE",
  defaultAccount: false,
});

function PayeeAvatar({ payee }: { payee: Payee }) {
  const { imageUrl } = usePayeeImage(payee.payeeUid);
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        className="payee-avatar"
        alt={payee.payeeName}
        onError={onError}
      />
    );
  }
  return (
    <div className="payee-avatar-initials">{payee.payeeName[0]}</div>
  );
}

function PayeeAccountRow({
  account,
  onHistory,
}: {
  account: PayeeAccount;
  onHistory?: () => void;
}) {
  return (
    <div className="payee-accounts-list__item">
      <span className="payee-accounts-list__desc">{account.description}</span>
      <span className="payee-accounts-list__detail">
        {account.bankIdentifier} / {account.accountIdentifier}
      </span>
      {onHistory && (
        <div className="payee-accounts-list__actions">
          <button className="payee-action-btn" onClick={onHistory} title="Payment history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function InlinePaymentCard({ payment, index }: { payment: Payment; index: number }) {
  const amt = getPaymentAmount(payment);
  const dateStr = payment.createdAt ?? payment.settlementDate;

  return (
    <div className="payment-card" style={{ animationDelay: `${index * 0.05}s` }}>
      {amt && (
        <div className="payment-card__amount">
          {formatPaymentAmount(amt.currency, amt.minorUnits)}
        </div>
      )}
      {payment.reference && (
        <div className="payment-card__reference">{payment.reference}</div>
      )}
      {dateStr && (
        <div className="payment-card__date">{formatPaymentDateTime(dateStr)}</div>
      )}
      {payment.spendingCategory && (
        <span className="payment-card__category">
          {payment.spendingCategory.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}

function InlineScheduledCard({ payment, index }: { payment: ScheduledPayment; index: number }) {
  const amt = payment.nextPaymentAmount ?? payment.amount;

  return (
    <div className="scheduled-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="scheduled-card__top-row">
        {payment.paymentType && (
          <span className="scheduled-card__type-badge">
            {payment.paymentType.replace(/_/g, " ")}
          </span>
        )}
        {amt && (
          <span className="scheduled-card__amount">
            {formatPaymentAmount(amt.currency, amt.minorUnits)}
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
          {payment.nextDate && <span>Next: {formatPaymentDate(payment.nextDate)}</span>}
          {payment.startDate && (
            <span>
              {formatPaymentDate(payment.startDate)}
              {payment.endDate ? ` — ${formatPaymentDate(payment.endDate)}` : " — ongoing"}
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

function HistoryView({
  payee,
  filterAccountUid,
  data,
  isPending,
  onBack,
}: {
  payee: Payee;
  filterAccountUid?: string;
  data: { payeeName: string; since: string; accountPayments: AccountPayments[] } | null;
  isPending: boolean;
  onBack: () => void;
}) {
  if (isPending || !data) {
    return (
      <div>
        <button className="payee-form__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="payments-loading">Loading payments...</div>
      </div>
    );
  }

  const accountPayments = filterAccountUid
    ? (data.accountPayments ?? []).filter(
        (ap) => ap.account.payeeAccountUid === filterAccountUid
      )
    : data.accountPayments ?? [];

  const totalPayments = accountPayments.reduce(
    (sum, ap) => sum + (ap.payments?.length ?? 0),
    0
  );

  return (
    <div>
      <button className="payee-form__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div className="payments-header">
        <span className="payments-header__title">{payee.payeeName}</span>
        <span className="payments-header__subtitle">
          {totalPayments} payment{totalPayments !== 1 ? "s" : ""} since{" "}
          <span className="payments-header__badge">{data.since.slice(0, 4)}</span>
        </span>
      </div>
      {accountPayments.length === 0 ? (
        <div className="payments-empty">No payments found</div>
      ) : (
        accountPayments.map((entry) => (
          <div className="payments-account" key={entry.account.payeeAccountUid}>
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
                <InlinePaymentCard key={payment.paymentUid ?? i} payment={payment} index={i} />
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ScheduledView({
  payee,
  data,
  isPending,
  onBack,
}: {
  payee: Payee;
  data: { payeeName: string; accountScheduledPayments: AccountScheduledPayments[] } | null;
  isPending: boolean;
  onBack: () => void;
}) {
  if (isPending || !data) {
    return (
      <div>
        <button className="payee-form__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="payments-loading">Loading scheduled payments...</div>
      </div>
    );
  }

  const accountScheduled = data.accountScheduledPayments ?? [];
  const totalScheduled = accountScheduled.reduce(
    (sum, asp) => sum + (asp.scheduledPayments?.length ?? 0),
    0
  );

  return (
    <div>
      <button className="payee-form__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div className="payments-header">
        <span className="payments-header__title">{payee.payeeName}</span>
        <span className="payments-header__subtitle">
          {totalScheduled} scheduled payment{totalScheduled !== 1 ? "s" : ""}
        </span>
      </div>
      {accountScheduled.length === 0 ? (
        <div className="payments-empty">No scheduled payments found</div>
      ) : (
        accountScheduled.map((entry) => (
          <div className="payments-account" key={entry.account.payeeAccountUid}>
            <div className="payments-account__header">
              <span className="payments-account__desc">{entry.account.description}</span>
              <span className="payments-account__detail">
                {entry.account.bankIdentifier} / {entry.account.accountIdentifier}
              </span>
            </div>
            {(entry.scheduledPayments ?? []).length === 0 ? (
              <div className="payments-empty">No scheduled payments for this account</div>
            ) : (
              entry.scheduledPayments.map((sp, i) => (
                <InlineScheduledCard key={sp.paymentOrderUid ?? i} payment={sp} index={i} />
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PayeeCard({
  payee,
  onEdit,
  onDelete,
  onHistory,
  onScheduled,
  isExpanded,
  onToggleExpand,
  onAccountHistory,
}: {
  payee: Payee;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onScheduled: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAccountHistory: (payeeAccountUid: string) => void;
}) {
  const hasMultipleAccounts = payee.accounts.length > 1;
  const singleAccount = payee.accounts.length === 1 ? payee.accounts[0] : null;

  return (
    <div className="payee-card">
      <div className="payee-card__row">
        <PayeeAvatar payee={payee} />
        <div className="payee-card__info">
          <span className="payee-card__name">{payee.payeeName}</span>
          <span className="payee-card__type-badge">{payee.payeeType}</span>
          {singleAccount && (
            <span className="payee-card__account-inline">
              {singleAccount.bankIdentifier} / {singleAccount.accountIdentifier}
            </span>
          )}
          {hasMultipleAccounts && (
            <span
              className="payee-card__account-count"
              style={{ cursor: "pointer" }}
              onClick={onToggleExpand}
            >
              {payee.accounts.length} accounts
              <svg
                className={`payee-card__chevron${isExpanded ? " payee-card__chevron--expanded" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline", verticalAlign: "middle", marginLeft: "0.25rem" }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          )}
        </div>
        <div className="payee-card__actions">
          <button className="payee-action-btn" onClick={onHistory} title="Payment history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button className="payee-action-btn" onClick={onScheduled} title="Scheduled payments">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <button className="payee-action-btn" onClick={onEdit} title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="payee-action-btn payee-action-btn--delete" onClick={onDelete} title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      {hasMultipleAccounts && (
        <div className={`payee-accounts-list${isExpanded ? " payee-accounts-list--expanded" : ""}`}>
          {payee.accounts.map((account) => (
            <PayeeAccountRow
              key={account.payeeAccountUid}
              account={account}
              onHistory={() => onAccountHistory(account.payeeAccountUid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountFormEntry({
  account,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  account: AccountFormData;
  index: number;
  onChange: (index: number, data: AccountFormData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const update = (field: keyof AccountFormData, value: string | boolean) => {
    onChange(index, { ...account, [field]: value });
  };

  return (
    <div className="payee-accounts-form__entry">
      <button
        className="payee-accounts-form__remove"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        title="Remove account"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="payee-form__group">
        <label className="payee-form__label">Description</label>
        <input
          className="payee-form__input"
          value={account.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
      <div className="payee-accounts-form__row">
        <div className="payee-form__group">
          <label className="payee-form__label">Country Code</label>
          <input
            className="payee-form__input"
            value={account.countryCode}
            onChange={(e) => update("countryCode", e.target.value)}
          />
        </div>
        <div className="payee-form__group">
          <label className="payee-form__label">Bank ID Type</label>
          <select
            className="payee-form__select"
            value={account.bankIdentifierType}
            onChange={(e) => update("bankIdentifierType", e.target.value)}
          >
            <option value="SORT_CODE">SORT_CODE</option>
            <option value="SWIFT">SWIFT</option>
            <option value="IBAN">IBAN</option>
            <option value="ABA">ABA</option>
            <option value="ABA_WIRE">ABA_WIRE</option>
            <option value="ABA_ACH">ABA_ACH</option>
          </select>
        </div>
      </div>
      <div className="payee-accounts-form__row">
        <div className="payee-form__group">
          <label className="payee-form__label">Account Identifier</label>
          <input
            className="payee-form__input"
            value={account.accountIdentifier}
            onChange={(e) => update("accountIdentifier", e.target.value)}
          />
        </div>
        <div className="payee-form__group">
          <label className="payee-form__label">Bank Identifier</label>
          <input
            className="payee-form__input"
            value={account.bankIdentifier}
            onChange={(e) => update("bankIdentifier", e.target.value)}
          />
        </div>
      </div>
      <label className="payee-accounts-form__checkbox">
        <input
          type="checkbox"
          checked={account.defaultAccount}
          onChange={(e) => update("defaultAccount", e.target.checked)}
        />
        Default account
      </label>
    </div>
  );
}

function PayeeForm({
  mode,
  target,
  onBack,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting,
  isSuccess,
}: {
  mode: "create" | "update";
  target: Payee | null;
  onBack: () => void;
  onSubmitCreate: (data: Record<string, unknown>) => void;
  onSubmitUpdate: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  isSuccess: boolean;
}) {
  const [payeeName, setPayeeName] = useState(target?.payeeName ?? "");
  const [payeeType, setPayeeType] = useState<"INDIVIDUAL" | "BUSINESS">(
    target?.payeeType ?? "INDIVIDUAL"
  );
  const [firstName, setFirstName] = useState(target?.firstName ?? "");
  const [middleName, setMiddleName] = useState(target?.middleName ?? "");
  const [lastName, setLastName] = useState(target?.lastName ?? "");
  const [businessName, setBusinessName] = useState(target?.businessName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(target?.phoneNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(target?.dateOfBirth ?? "");
  const [accounts, setAccounts] = useState<AccountFormData[]>([emptyAccount()]);

  const handleAccountChange = (index: number, data: AccountFormData) => {
    setAccounts((prev) => prev.map((a, i) => (i === index ? data : a)));
  };

  const handleAccountRemove = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const base: Record<string, unknown> = { payeeName, payeeType };
    if (payeeType === "INDIVIDUAL") {
      if (firstName) base.firstName = firstName;
      if (middleName) base.middleName = middleName;
      if (lastName) base.lastName = lastName;
    } else {
      if (businessName) base.businessName = businessName;
    }
    if (phoneNumber) base.phoneNumber = phoneNumber;
    if (dateOfBirth) base.dateOfBirth = dateOfBirth;

    if (mode === "create") {
      base.accounts = accounts.map((a) => ({
        description: a.description,
        countryCode: a.countryCode,
        accountIdentifier: a.accountIdentifier,
        bankIdentifier: a.bankIdentifier,
        bankIdentifierType: a.bankIdentifierType,
        defaultAccount: a.defaultAccount,
      }));
      onSubmitCreate(base);
    } else {
      base.payeeUid = target!.payeeUid;
      onSubmitUpdate(base);
    }
  };

  return (
    <div className="payee-form">
      <button className="payee-form__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <h2 className="payee-form__title">
        {mode === "create" ? "Create Payee" : "Update Payee"}
      </h2>

      <div className="payee-form__group">
        <label className="payee-form__label">Payee Name</label>
        <input
          className="payee-form__input"
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
          required
        />
      </div>

      <div className="payee-form__group">
        <label className="payee-form__label">Type</label>
        <div className="payee-form__segmented">
          <button
            className={`payee-form__segment${payeeType === "INDIVIDUAL" ? " payee-form__segment--active" : ""}`}
            onClick={() => setPayeeType("INDIVIDUAL")}
            type="button"
          >
            Individual
          </button>
          <button
            className={`payee-form__segment${payeeType === "BUSINESS" ? " payee-form__segment--active" : ""}`}
            onClick={() => setPayeeType("BUSINESS")}
            type="button"
          >
            Business
          </button>
        </div>
      </div>

      {payeeType === "INDIVIDUAL" ? (
        <>
          <div className="payee-form__group">
            <label className="payee-form__label">First Name</label>
            <input
              className="payee-form__input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="payee-form__group">
            <label className="payee-form__label">Middle Name</label>
            <input
              className="payee-form__input"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>
          <div className="payee-form__group">
            <label className="payee-form__label">Last Name</label>
            <input
              className="payee-form__input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="payee-form__group">
          <label className="payee-form__label">Business Name</label>
          <input
            className="payee-form__input"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
      )}

      <div className="payee-form__group">
        <label className="payee-form__label">Phone Number</label>
        <input
          className="payee-form__input"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <div className="payee-form__group">
        <label className="payee-form__label">Date of Birth</label>
        <input
          className="payee-form__input"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>

      {mode === "create" && (
        <div className="payee-accounts-form">
          <span className="payee-accounts-form__title">Accounts</span>
          {accounts.map((account, i) => (
            <AccountFormEntry
              key={i}
              account={account}
              index={i}
              onChange={handleAccountChange}
              onRemove={handleAccountRemove}
              canRemove={accounts.length > 1}
            />
          ))}
          <button
            className="payee-accounts-form__add"
            type="button"
            onClick={() => setAccounts((prev) => [...prev, emptyAccount()])}
          >
            + Add Account
          </button>
        </div>
      )}

      <button
        className={`payee-form__submit${isSuccess ? " payee-form__submit--success" : ""}`}
        onClick={handleSubmit}
        disabled={isSubmitting || !payeeName}
      >
        {isSubmitting && <span className="payee-spinner" />}
        {isSuccess
          ? "Requested you for confirmation on your device"
          : mode === "create"
            ? "Create Payee"
            : "Update Payee"}
      </button>
    </div>
  );
}

function DeleteOverlay({
  payee,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  payee: Payee;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const firstAccount = payee.accounts[0];

  return (
    <div className="payee-delete-overlay">
      <div className="payee-delete-dialog">
        <div className="payee-delete-dialog__title">
          Are you sure you want to delete {payee.payeeName}?
        </div>
        <div className="payee-delete-dialog__info">
          <span className="payee-card__type-badge">{payee.payeeType}</span>
          {firstAccount && (
            <span style={{ marginLeft: "0.5rem" }}>
              {firstAccount.description} &mdash; {firstAccount.bankIdentifier} / {firstAccount.accountIdentifier}
            </span>
          )}
        </div>
        <div className="payee-delete-dialog__actions">
          <button className="payee-delete-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="payee-delete-confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <span className="payee-spinner" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function GetPayees() {
  const { output } = useToolInfo<"get-payees">();

  const [view, setView] = useState<"list" | "create" | "update" | "history" | "scheduled">("list");
  const [updateTarget, setUpdateTarget] = useState<Payee | null>(null);
  const [expandedPayeeUid, setExpandedPayeeUid] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payee | null>(null);
  const [paymentsTarget, setPaymentsTarget] = useState<{
    payee: Payee;
    filterAccountUid?: string;
  } | null>(null);

  const {
    callTool: callCreate,
    isPending: isCreating,
    isSuccess: createSuccess,
  } = useCallTool("create-payee");
  const {
    callTool: callUpdate,
    isPending: isUpdating,
    isSuccess: updateSuccess,
  } = useCallTool("update-payee");
  const { callTool: callDelete, isPending: isDeleting } =
    useCallTool("delete-payee");

  const history = useCallTool("get-payee-historic-payments");
  const scheduled = useCallTool("get-payee-scheduled-payments");

  const openHistory = (payee: Payee, filterAccountUid?: string) => {
    setPaymentsTarget({ payee, filterAccountUid });
    setView("history");
    const sinceYear = new Date().getFullYear() - 3;
    history.callTool({
      payeeUid: payee.payeeUid,
      since: `${sinceYear}-01-01`,
    });
  };

  const openScheduled = (payee: Payee) => {
    setPaymentsTarget({ payee });
    setView("scheduled");
    scheduled.callTool({ payeeUid: payee.payeeUid });
  };

  if (!output) {
    return (
      <div className="payees-container">
        <div className="payees-loading">Loading payees...</div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="payees-container">
        <PayeeForm
          mode="create"
          target={null}
          onBack={() => setView("list")}
          onSubmitCreate={(data) => callCreate(data as Parameters<typeof callCreate>[0])}
          onSubmitUpdate={() => {}}
          isSubmitting={isCreating}
          isSuccess={createSuccess}
        />
      </div>
    );
  }

  if (view === "update" && updateTarget) {
    return (
      <div className="payees-container">
        <PayeeForm
          mode="update"
          target={updateTarget}
          onBack={() => setView("list")}
          onSubmitCreate={() => {}}
          onSubmitUpdate={(data) => callUpdate(data as Parameters<typeof callUpdate>[0])}
          isSubmitting={isUpdating}
          isSuccess={updateSuccess}
        />
      </div>
    );
  }

  if (view === "history" && paymentsTarget) {
    return (
      <div className="payees-container">
        <HistoryView
          payee={paymentsTarget.payee}
          filterAccountUid={paymentsTarget.filterAccountUid}
          data={(history.data?.structuredContent as unknown as { payeeName: string; since: string; accountPayments: AccountPayments[] }) ?? null}
          isPending={history.isPending}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "scheduled" && paymentsTarget) {
    return (
      <div className="payees-container">
        <ScheduledView
          payee={paymentsTarget.payee}
          data={(scheduled.data?.structuredContent as unknown as { payeeName: string; accountScheduledPayments: AccountScheduledPayments[] }) ?? null}
          isPending={scheduled.isPending}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  const payees: Payee[] = output.payees ?? [];

  return (
    <div className="payees-container">
      <div className="payees-header">
        <span className="payees-header__title">Payees</span>
        <button className="payee-action-add" onClick={() => setView("create")} title="Add payee">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {payees.length === 0 ? (
        <div className="payees-empty">
          <span className="payees-empty__text">No payees yet</span>
          <button className="payee-action-add" onClick={() => setView("create")} title="Add payee">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      ) : (
        payees.map((payee) => (
          <PayeeCard
            key={payee.payeeUid}
            payee={payee}
            onEdit={() => {
              setUpdateTarget(payee);
              setView("update");
            }}
            onDelete={() => setDeleteTarget(payee)}
            onHistory={() => openHistory(payee)}
            onScheduled={() => openScheduled(payee)}
            isExpanded={expandedPayeeUid === payee.payeeUid}
            onToggleExpand={() =>
              setExpandedPayeeUid((prev) =>
                prev === payee.payeeUid ? null : payee.payeeUid
              )
            }
            onAccountHistory={(payeeAccountUid) => openHistory(payee, payeeAccountUid)}
          />
        ))
      )}

      {deleteTarget && (
        <DeleteOverlay
          payee={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() =>
            callDelete(
              { payeeUid: deleteTarget.payeeUid },
              { onSuccess: () => setDeleteTarget(null) }
            )
          }
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

export default GetPayees;
mountWidget(<GetPayees />);
