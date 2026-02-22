import "@/index.css";
import { useState, useCallback } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

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

type FlowState = "account" | "space" | "form" | "transferring" | "success";

function AddMoneyToSpace() {
  const { output, responseMetadata } = useToolInfo<"add-money-to-space">();
  const images = (responseMetadata?.images ?? {}) as Record<string, string>;

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Add Money to Space</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <AddMoneyInner
      accounts={output.accounts ?? []}
      images={images}
      selectedAccountUid={output.selectedAccountUid ?? null}
      selectedSpaceUid={output.selectedSpaceUid ?? null}
      prefill={output.prefill ?? {}}
    />
  );
}

function AddMoneyInner({
  accounts,
  images,
  selectedAccountUid,
  selectedSpaceUid,
  prefill,
}: {
  accounts: Account[];
  images: Record<string, string>;
  selectedAccountUid: string | null;
  selectedSpaceUid: string | null;
  prefill: { transferUid?: string };
}) {
  const sendFollowUp = useSendFollowUpMessage();
  const { callToolAsync: doTransfer } = useCallTool("transfer-to-space");

  const preSelectedAccount = selectedAccountUid
    ? accounts.find((a) => a.accountUid === selectedAccountUid) ?? null
    : null;
  const preSelectedSpace =
    preSelectedAccount && selectedSpaceUid
      ? preSelectedAccount.spaces.find(
          (s) => s.savingsGoalUid === selectedSpaceUid
        ) ?? null
      : null;

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    preSelectedAccount
  );
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(
    preSelectedSpace
  );
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [flowState, setFlowState] = useState<FlowState>(
    preSelectedSpace ? "form" : preSelectedAccount ? "space" : "account"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedAccount || !selectedSpace || !amount) return;

    const currency = selectedSpace.totalSaved.currency;
    const minorUnits = Math.round(parseFloat(amount) * 100);
    if (minorUnits <= 0) return;

    setFlowState("transferring");
    setError(null);

    try {
      await doTransfer({
        accountUid: selectedAccount.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
        transferUid: prefill.transferUid!,
        amount: { currency, minorUnits },
      });

      setFlowState("success");
      sendFollowUp(
        `[Add Money to Space] The user added ${formatAmount(currency, minorUnits)} to the space "${selectedSpace.name}"${reference ? ` with reference "${reference}"` : ""}.`
      );
    } catch {
      setError("Transfer failed. Please try again.");
      setFlowState("form");
    }
  };

  // Account selector
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
                          account.balance.effectiveBalance.minorUnits
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

  // Space selector
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
                  setFlowState("form");
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
                      space.totalSaved.minorUnits
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

  // Form + overlay
  const currency = selectedSpace?.totalSaved.currency ?? "GBP";

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
          Add Money to {selectedSpace?.name}
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

        <div className="space-form__group">
          <label className="space-form__label">Amount ({currency})</label>
          <input
            className="space-form__input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-form__group">
          <label className="space-form__label">Reference (optional)</label>
          <input
            className="space-form__input"
            value={reference}
            onChange={(e) => setReference(e.target.value.slice(0, 100))}
            placeholder="e.g. Birthday savings"
            maxLength={100}
          />
        </div>

        <button
          className="space-form__submit"
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Add Money
        </button>
      </div>

      {flowState === "transferring" && (
        <div className="transfer-overlay transfer-overlay--pending">
          <span
            className="payee-spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
          />
          <span className="transfer-overlay__message">Transferring...</span>
        </div>
      )}

      {flowState === "success" && (
        <div className="transfer-overlay transfer-overlay--success">
          <svg
            className="transfer-checkmark"
            viewBox="0 0 52 52"
            width="64"
            height="64"
          >
            <circle
              className="transfer-checkmark__circle"
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
            />
            <path
              className="transfer-checkmark__check"
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 27l8 8 16-16"
            />
          </svg>
          <div className="transfer-overlay__details">
            <span
              style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}
            >
              {formatAmount(currency, Math.round(parseFloat(amount) * 100))}
            </span>
            <span
              style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
            >
              added to {selectedSpace?.name}
            </span>
            {reference && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.7)",
                  fontStyle: "italic",
                }}
              >
                {reference}
              </span>
            )}
          </div>
          <button
            className="transfer-overlay__done"
            onClick={() => {
              setAmount("");
              setReference("");
              setError(null);
              setFlowState("form");
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default AddMoneyToSpace;
mountWidget(<AddMoneyToSpace />);
