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

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
type EndCondition = "none" | "count" | "until";

const ALL_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const FREQ_LABELS: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const FREQ_UNITS: Record<Frequency, string> = {
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};

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

function describeFrequency(
  frequency: Frequency,
  interval: number,
  days: DayOfWeek[],
): string {
  if (interval === 1) {
    if (frequency === "WEEKLY" && days.length > 0) {
      return `Weekly on ${days.map((d) => DAY_LABELS[d]).join(", ")}`;
    }
    return FREQ_LABELS[frequency];
  }
  return `Every ${interval} ${FREQ_UNITS[frequency]}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

type FlowState = "account" | "space" | "form" | "submitting" | "success";

function SetupRecurringTransferToSpace() {
  const { output } = useToolInfo<"setup-recurring-transfer-to-space">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Set Up Recurring Transfer</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <SetupInner
      accounts={output.accounts ?? []}
      selectedAccountUid={output.selectedAccountUid ?? null}
      selectedSpaceUid={output.selectedSpaceUid ?? null}
      prefill={output.prefill ?? {}}
    />
  );
}

function SetupInner({
  accounts,
  selectedAccountUid,
  selectedSpaceUid,
  prefill,
}: {
  accounts: Account[];
  selectedAccountUid: string | null;
  selectedSpaceUid: string | null;
  prefill: {
    amountMinorUnits?: number;
    currency?: string;
    frequency?: string;
    startDate?: string;
    interval?: number;
    reference?: string;
  };
}) {
  const sendFollowUp = useSendFollowUpMessage();
  const { callToolAsync: doSetup } = useCallTool(
    "setup-recurring-transfer-to-space-internal",
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

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    preSelectedAccount,
  );
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(
    preSelectedSpace,
  );
  const [amount, setAmount] = useState(
    prefill.amountMinorUnits
      ? (prefill.amountMinorUnits / 100).toString()
      : "",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    (prefill.frequency as Frequency) ?? "MONTHLY",
  );
  const [startDate, setStartDate] = useState(prefill.startDate ?? todayISO());
  const [interval, setInterval] = useState(
    prefill.interval?.toString() ?? "1",
  );
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [endCondition, setEndCondition] = useState<EndCondition>("none");
  const [count, setCount] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [reference, setReference] = useState(prefill.reference ?? "");
  const [flowState, setFlowState] = useState<FlowState>(
    preSelectedSpace ? "form" : preSelectedAccount ? "space" : "account",
  );
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    if (!selectedAccount || !selectedSpace || !amount) return;

    const currency =
      prefill.currency ?? selectedSpace.totalSaved.currency;
    const minorUnits = Math.round(parseFloat(amount) * 100);
    if (minorUnits <= 0) return;

    setFlowState("submitting");
    setError(null);

    const recurrenceRule: Record<string, unknown> = {
      startDate,
      frequency,
    };
    const intervalNum = parseInt(interval, 10);
    if (intervalNum > 1) recurrenceRule.interval = intervalNum;
    if (frequency === "WEEKLY" && days.length > 0)
      recurrenceRule.days = days;
    if (endCondition === "count" && count)
      recurrenceRule.count = parseInt(count, 10);
    if (endCondition === "until" && untilDate)
      recurrenceRule.untilDate = untilDate;

    try {
      await doSetup({
        accountUid: selectedAccount.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
        amount: { currency, minorUnits },
        recurrenceRule: recurrenceRule as {
          startDate: string;
          frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
        },
        ...(reference ? { reference } : {}),
      });

      setFlowState("success");
      sendFollowUp(
        `[Recurring Transfer] The user set up a recurring transfer of ${formatAmount(currency, minorUnits)} ${describeFrequency(frequency, intervalNum, days).toLowerCase()} to the space "${selectedSpace.name}"${reference ? ` with reference "${reference}"` : ""}.`,
      );
    } catch {
      setError("Failed to set up recurring transfer. Please try again.");
      setFlowState("form");
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

  const currency =
    prefill.currency ?? selectedSpace?.totalSaved.currency ?? "GBP";
  const intervalNum = parseInt(interval, 10) || 1;

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
          Recurring Transfer to {selectedSpace?.name}
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
          <label className="space-form__label">Frequency</label>
          <select
            className="space-form__select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        <div className="space-form__group">
          <label className="space-form__label">Start Date</label>
          <input
            className="space-form__input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-form__group">
          <label className="space-form__label">
            Every {interval || "1"} {FREQ_UNITS[frequency]}
          </label>
          <input
            className="space-form__input"
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          />
        </div>

        {frequency === "WEEKLY" && (
          <div className="space-form__group">
            <label className="space-form__label">Days of Week</label>
            <div className="day-pills">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`day-pill${days.includes(day) ? " day-pill--active" : ""}`}
                  onClick={() => toggleDay(day)}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-form__group">
          <label className="space-form__label">End Condition</label>
          <div className="end-condition-group">
            <label className="end-condition-option">
              <input
                type="radio"
                name="endCondition"
                checked={endCondition === "none"}
                onChange={() => setEndCondition("none")}
              />
              No end date
            </label>
            <label className="end-condition-option">
              <input
                type="radio"
                name="endCondition"
                checked={endCondition === "count"}
                onChange={() => setEndCondition("count")}
              />
              After N payments
            </label>
            {endCondition === "count" && (
              <input
                className="space-form__input"
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Number of payments"
              />
            )}
            <label className="end-condition-option">
              <input
                type="radio"
                name="endCondition"
                checked={endCondition === "until"}
                onChange={() => setEndCondition("until")}
              />
              Until date
            </label>
            {endCondition === "until" && (
              <input
                className="space-form__input"
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="space-form__group">
          <label className="space-form__label">Reference (optional)</label>
          <input
            className="space-form__input"
            value={reference}
            onChange={(e) => setReference(e.target.value.slice(0, 100))}
            placeholder="e.g. Monthly savings"
            maxLength={100}
          />
        </div>

        <button
          className="space-form__submit"
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Set Up Recurring Transfer
        </button>
      </div>

      {flowState === "submitting" && (
        <div className="transfer-overlay transfer-overlay--pending">
          <span
            className="payee-spinner"
            style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
          />
          <span className="transfer-overlay__message">Setting up...</span>
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
              {formatAmount(
                currency,
                Math.round(parseFloat(amount) * 100),
              )}
            </span>
            <span
              style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
            >
              {describeFrequency(frequency, intervalNum, days).toLowerCase()}{" "}
              to {selectedSpace?.name}
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

export default SetupRecurringTransferToSpace;
mountWidget(<SetupRecurringTransferToSpace />);
