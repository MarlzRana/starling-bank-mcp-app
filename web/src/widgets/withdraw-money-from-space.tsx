import "@/index.css";
import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";
import { SpaceListPhoto } from "../components/space-photo.js";

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

type FlowState = "account" | "space" | "form" | "transferring" | "success";

function WithdrawMoneyFromSpace() {
  const { output } = useToolInfo<"withdraw-money-from-space">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Withdraw from Space</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <WithdrawInner
      accounts={output.accounts ?? []}
      selectedAccountUid={output.selectedAccountUid ?? null}
      selectedSpaceUid={output.selectedSpaceUid ?? null}
      prefill={output.prefill ?? {}}
    />
  );
}

function WithdrawInner({
  accounts,
  selectedAccountUid,
  selectedSpaceUid,
  prefill,
}: {
  accounts: Account[];
  selectedAccountUid: string | null;
  selectedSpaceUid: string | null;
  prefill: { transferUid?: string };
}) {
  const sendFollowUp = useSendFollowUpMessage();
  const { callToolAsync: doWithdraw } = useCallTool("transfer-from-space");

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
      await doWithdraw({
        accountUid: selectedAccount.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
        transferUid: prefill.transferUid!,
        amount: { currency, minorUnits },
      });

      setFlowState("success");
      sendFollowUp(
        `[Withdraw from Space] The user withdrew ${formatAmount(currency, minorUnits)} from the space "${selectedSpace.name}"${reference ? ` with reference "${reference}"` : ""}.`
      );
    } catch {
      setError("Withdrawal failed. Please try again.");
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
                  accountUid={selectedAccount.accountUid}
                  savingsGoalUid={space.savingsGoalUid}
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
          Withdraw from {selectedSpace?.name}
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
            placeholder="e.g. Emergency withdrawal"
            maxLength={100}
          />
        </div>

        <button
          className="space-form__submit"
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Withdraw
        </button>
      </div>

      {flowState === "transferring" && (
        <div className="transfer-overlay transfer-overlay--pending">
          <span
            className="payee-spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
          />
          <span className="transfer-overlay__message">Withdrawing...</span>
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
              withdrawn from {selectedSpace?.name}
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

export default WithdrawMoneyFromSpace;
mountWidget(<WithdrawMoneyFromSpace />);
