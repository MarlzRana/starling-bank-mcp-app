import "@/index.css";
import { useState, useCallback } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface Space {
  savingsGoalUid: string;
  name: string;
  state: string;
  totalSaved: MinorUnitsAmount;
  target?: MinorUnitsAmount;
}

interface Account {
  accountUid: string;
  name: string;
  currency: string;
  accountType: string;
  balance?: {
    effectiveBalance?: MinorUnitsAmount;
  };
  spaces: Space[];
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
    new Date(iso),
  );
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

function SpaceListPhoto({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  if (image && !failed) {
    return (
      <img
        src={image}
        className="space-list-item__photo"
        alt={name}
        onError={onError}
      />
    );
  }
  return <div className="space-list-item__photo-initials">{name[0]}</div>;
}

type FlowState = "account" | "space" | "detail";

function GetRecurringTransferToSpace() {
  const { output, responseMetadata } =
    useToolInfo<"get-recurring-transfer-to-space">();
  const images = (responseMetadata?.images ?? {}) as Record<string, string>;

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Recurring Transfer</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <GetRecurringInner
      accounts={output.accounts ?? []}
      images={images}
      selectedAccountUid={output.selectedAccountUid ?? null}
      selectedSpaceUid={output.selectedSpaceUid ?? null}
      recurringTransfers={
        (output.recurringTransfers ?? {}) as Record<
          string,
          RecurringTransfer
        >
      }
    />
  );
}

function GetRecurringInner({
  accounts,
  images,
  selectedAccountUid,
  selectedSpaceUid,
  recurringTransfers,
}: {
  accounts: Account[];
  images: Record<string, string>;
  selectedAccountUid: string | null;
  selectedSpaceUid: string | null;
  recurringTransfers: Record<string, RecurringTransfer>;
}) {
  const preSelectedAccount = selectedAccountUid
    ? accounts.find((a) => a.accountUid === selectedAccountUid) ?? null
    : null;
  const preSelectedSpace =
    preSelectedAccount && selectedSpaceUid
      ? preSelectedAccount.spaces.find(
          (s) => s.savingsGoalUid === selectedSpaceUid,
        ) ?? null
      : null;

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    preSelectedAccount,
  );
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(
    preSelectedSpace,
  );
  const [flowState, setFlowState] = useState<FlowState>(
    preSelectedSpace ? "detail" : preSelectedAccount ? "space" : "account",
  );

  const recurringTransfer = selectedSpace
    ? recurringTransfers[selectedSpace.savingsGoalUid] ?? null
    : null;

  if (flowState === "account") {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Select Account</h2>
          {accounts.length === 0 ? (
            <div
              style={{
                color: "var(--color-text-secondary)",
                textAlign: "center",
                padding: "1rem",
              }}
            >
              No accounts found
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.accountUid}
                className="space-account-card"
                onClick={() => {
                  setSelectedAccount(account);
                  setFlowState("space");
                }}
              >
                <div className="space-account-card__info">
                  <span className="space-account-card__name">
                    {account.name}
                  </span>
                  <span className="space-account-card__balance">
                    {account.balance?.effectiveBalance
                      ? formatAmount(
                          account.balance.effectiveBalance.currency,
                          account.balance.effectiveBalance.minorUnits,
                        )
                      : account.currency}
                  </span>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: "var(--color-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (flowState === "space" && selectedAccount) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              setSelectedAccount(null);
              setFlowState("account");
            }}
            type="button"
          >
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

          <h2 className="space-form__title">Select Space</h2>

          {selectedAccount.spaces.length === 0 ? (
            <div
              style={{
                color: "var(--color-text-secondary)",
                textAlign: "center",
                padding: "1rem",
              }}
            >
              No spaces found for this account
            </div>
          ) : (
            selectedAccount.spaces.map((space) => (
              <div
                className="space-list-item"
                key={space.savingsGoalUid}
                onClick={() => {
                  setSelectedSpace(space);
                  setFlowState("detail");
                }}
              >
                <SpaceListPhoto
                  name={space.name}
                  image={images[space.savingsGoalUid]}
                />
                <div className="space-list-item__info">
                  <span className="space-list-item__name">{space.name}</span>
                  <span className="space-list-item__saved">
                    {formatAmount(
                      space.totalSaved.currency,
                      space.totalSaved.minorUnits,
                    )}
                  </span>
                </div>
                <span
                  className={`space-card__state-badge${space.state === "ACTIVE" ? " space-card__state-badge--active" : ""}`}
                >
                  {space.state}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="payees-container">
      <div className="space-form">
        <button
          className="payee-form__back"
          onClick={() => {
            setSelectedSpace(null);
            setFlowState("space");
          }}
          type="button"
        >
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

        <h2 className="space-form__title">
          Recurring Transfer to {selectedSpace?.name}
        </h2>

        {recurringTransfer ? (
          <div className="recurring-transfer-card">
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">Amount</span>
              <span className="recurring-transfer-card__amount">
                {formatAmount(
                  recurringTransfer.currencyAndAmount.currency,
                  recurringTransfer.currencyAndAmount.minorUnits,
                )}
              </span>
            </div>
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">Frequency</span>
              <span className="recurring-transfer-card__value">
                {describeFrequency(recurringTransfer.recurrenceRule)}
              </span>
            </div>
            {recurringTransfer.nextPaymentDate && (
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">
                  Next Payment
                </span>
                <span className="recurring-transfer-card__value">
                  {formatDate(recurringTransfer.nextPaymentDate)}
                </span>
              </div>
            )}
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">Start Date</span>
              <span className="recurring-transfer-card__value">
                {formatDate(recurringTransfer.recurrenceRule.startDate)}
              </span>
            </div>
            {recurringTransfer.recurrenceRule.untilDate && (
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">Until</span>
                <span className="recurring-transfer-card__value">
                  {formatDate(recurringTransfer.recurrenceRule.untilDate)}
                </span>
              </div>
            )}
            {recurringTransfer.recurrenceRule.count && (
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">
                  Payments
                </span>
                <span className="recurring-transfer-card__value">
                  {recurringTransfer.recurrenceRule.count} total
                </span>
              </div>
            )}
            {recurringTransfer.reference && (
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">
                  Reference
                </span>
                <span className="recurring-transfer-card__value">
                  {recurringTransfer.reference}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-empty">
            No recurring transfer set up for this space.
          </div>
        )}
      </div>
    </div>
  );
}

export default GetRecurringTransferToSpace;
mountWidget(<GetRecurringTransferToSpace />);
