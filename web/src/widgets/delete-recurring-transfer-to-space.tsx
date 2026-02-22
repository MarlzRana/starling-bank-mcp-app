import "@/index.css";
import { useState, useCallback } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";
import binIcon from "../assets/bin.svg";

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

type FlowState =
  | "account"
  | "space"
  | "confirm"
  | "deleting"
  | "success"
  | "no-transfer";

function DeleteRecurringTransferToSpace() {
  const { output, responseMetadata } =
    useToolInfo<"delete-recurring-transfer-to-space">();
  const images = (responseMetadata?.images ?? {}) as Record<string, string>;

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Delete Recurring Transfer</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <DeleteInner
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

function DeleteInner({
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
  const sendFollowUp = useSendFollowUpMessage();
  const { callToolAsync: doDelete } = useCallTool(
    "delete-recurring-transfer-to-space-internal",
  );

  const preSelectedAccount = selectedAccountUid
    ? accounts.find((a) => a.accountUid === selectedAccountUid) ?? null
    : null;
  const preSelectedSpace =
    preSelectedAccount && selectedSpaceUid
      ? preSelectedAccount.spaces.find(
          (s) => s.savingsGoalUid === selectedSpaceUid,
        ) ?? null
      : null;

  const hasBothPreSelected = !!(preSelectedAccount && preSelectedSpace);
  const preSelectedTransfer = preSelectedSpace
    ? recurringTransfers[preSelectedSpace.savingsGoalUid] ?? null
    : null;

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    preSelectedAccount,
  );
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(
    preSelectedSpace,
  );
  const [transfers, setTransfers] =
    useState<Record<string, RecurringTransfer>>(recurringTransfers);
  const [flowState, setFlowState] = useState<FlowState>(
    hasBothPreSelected
      ? preSelectedTransfer
        ? "confirm"
        : "no-transfer"
      : preSelectedAccount
        ? "space"
        : "account",
  );
  const [error, setError] = useState<string | null>(null);

  const recurringTransfer = selectedSpace
    ? transfers[selectedSpace.savingsGoalUid] ?? null
    : null;

  const handleSpaceSelected = (space: Space) => {
    setSelectedSpace(space);
    const rt = transfers[space.savingsGoalUid] ?? null;
    setFlowState(rt ? "confirm" : "no-transfer");
  };

  const handleDelete = async () => {
    if (!selectedAccount || !selectedSpace) return;

    setFlowState("deleting");
    setError(null);

    try {
      await doDelete({
        accountUid: selectedAccount.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
      });

      setTransfers((prev) => {
        const next = { ...prev };
        delete next[selectedSpace.savingsGoalUid];
        return next;
      });
      setFlowState("success");
      sendFollowUp(
        `[Delete Recurring Transfer] The user deleted the recurring transfer to the space "${selectedSpace.name}".`,
      );
    } catch {
      setError("Failed to delete recurring transfer. Please try again.");
      setFlowState("confirm");
    }
  };

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
                onClick={() => handleSpaceSelected(space)}
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

  if (flowState === "no-transfer") {
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
          <div className="space-empty">
            No recurring transfer exists for this space.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payees-container" style={{ position: "relative" }}>
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
          Delete Recurring Transfer to {selectedSpace?.name}
        </h2>

        {error && (
          <div className="payee-result__error">
            <svg
              className="payee-result__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {recurringTransfer && (
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
        )}

        <button
          className="space-form__submit space-form__submit--destructive"
          onClick={handleDelete}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete Recurring Transfer
        </button>
      </div>

      {flowState === "deleting" && (
        <div className="transfer-overlay transfer-overlay--pending">
          <span
            className="payee-spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
          />
          <span className="transfer-overlay__message">Deleting...</span>
        </div>
      )}

      {flowState === "success" && (
        <div className="transfer-overlay transfer-overlay--deleted">
          <img src={binIcon} alt="Deleted" className="transfer-bin-icon" />
          <div className="transfer-overlay__details">
            <span
              style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}
            >
              Recurring transfer deleted
            </span>
            <span
              style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
            >
              {selectedSpace?.name}
            </span>
          </div>
          <button
            className="transfer-overlay__done"
            onClick={() => {
              setSelectedSpace(null);
              setError(null);
              setFlowState("space");
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default DeleteRecurringTransferToSpace;
mountWidget(<DeleteRecurringTransferToSpace />);
