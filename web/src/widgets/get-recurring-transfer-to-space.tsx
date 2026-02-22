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

function describeFrequencyParams(
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
  | "detail"
  | "setup-form"
  | "setup-submitting"
  | "setup-success"
  | "delete-confirm"
  | "delete-deleting"
  | "delete-success";

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
  const sendFollowUp = useSendFollowUpMessage();
  const { callToolAsync: doSetup } = useCallTool(
    "setup-recurring-transfer-to-space-internal",
  );
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

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    preSelectedAccount,
  );
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(
    preSelectedSpace,
  );
  const [transfers, setTransfers] =
    useState<Record<string, RecurringTransfer>>(recurringTransfers);
  const [flowState, setFlowState] = useState<FlowState>(
    preSelectedSpace ? "detail" : preSelectedAccount ? "space" : "account",
  );

  const recurringTransfer = selectedSpace
    ? transfers[selectedSpace.savingsGoalUid] ?? null
    : null;

  // Setup form state
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const [startDate, setStartDate] = useState(todayISO());
  const [interval, setInterval] = useState("1");
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [endCondition, setEndCondition] = useState<EndCondition>("none");
  const [count, setCount] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetSetupForm = () => {
    setAmount("");
    setFrequency("MONTHLY");
    setStartDate(todayISO());
    setInterval("1");
    setDays([]);
    setEndCondition("none");
    setCount("");
    setUntilDate("");
    setReference("");
    setError(null);
  };

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSetup = async () => {
    if (!selectedAccount || !selectedSpace || !amount) return;

    const currency = selectedSpace.totalSaved.currency;
    const minorUnits = Math.round(parseFloat(amount) * 100);
    if (minorUnits <= 0) return;

    setFlowState("setup-submitting");
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

      setTransfers((prev) => ({
        ...prev,
        [selectedSpace.savingsGoalUid]: {
          transferUid: "new",
          recurrenceRule: {
            startDate,
            frequency,
            ...(intervalNum > 1 ? { interval: intervalNum } : {}),
            ...(frequency === "WEEKLY" && days.length > 0
              ? { days: [...days] }
              : {}),
            ...(endCondition === "count" && count
              ? { count: parseInt(count, 10) }
              : {}),
            ...(endCondition === "until" && untilDate ? { untilDate } : {}),
          },
          currencyAndAmount: { currency, minorUnits },
          ...(reference ? { reference } : {}),
        },
      }));
      setFlowState("setup-success");
      sendFollowUp(
        `[Recurring Transfer] The user set up a recurring transfer of ${formatAmount(currency, minorUnits)} ${describeFrequencyParams(frequency, intervalNum, days).toLowerCase()} to the space "${selectedSpace.name}"${reference ? ` with reference "${reference}"` : ""}.`,
      );
    } catch {
      setError("Failed to set up recurring transfer. Please try again.");
      setFlowState("setup-form");
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount || !selectedSpace) return;

    setFlowState("delete-deleting");
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
      setFlowState("delete-success");
      sendFollowUp(
        `[Delete Recurring Transfer] The user deleted the recurring transfer to the space "${selectedSpace.name}".`,
      );
    } catch {
      setError("Failed to delete recurring transfer. Please try again.");
      setFlowState("delete-confirm");
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

  // Setup flow
  if (
    flowState === "setup-form" ||
    flowState === "setup-submitting" ||
    flowState === "setup-success"
  ) {
    const currency = selectedSpace?.totalSaved.currency ?? "GBP";
    const intervalNum = parseInt(interval, 10) || 1;

    return (
      <div className="payees-container" style={{ position: "relative" }}>
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              resetSetupForm();
              setFlowState("detail");
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
            Set Up Recurring Transfer to {selectedSpace?.name}
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
            onClick={handleSetup}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Set Up Recurring Transfer
          </button>
        </div>

        {flowState === "setup-submitting" && (
          <div className="transfer-overlay transfer-overlay--pending">
            <span
              className="payee-spinner"
              style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
            />
            <span className="transfer-overlay__message">Setting up...</span>
          </div>
        )}

        {flowState === "setup-success" && (
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
                  selectedSpace?.totalSaved.currency ?? "GBP",
                  Math.round(parseFloat(amount) * 100),
                )}
              </span>
              <span
                style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
              >
                {describeFrequencyParams(frequency, intervalNum, days).toLowerCase()}{" "}
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
                resetSetupForm();
                setFlowState("detail");
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  // Delete flow
  if (
    flowState === "delete-confirm" ||
    flowState === "delete-deleting" ||
    flowState === "delete-success"
  ) {
    return (
      <div className="payees-container" style={{ position: "relative" }}>
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              setError(null);
              setFlowState("detail");
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
                <span className="recurring-transfer-card__label">
                  Frequency
                </span>
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
                <span className="recurring-transfer-card__label">
                  Start Date
                </span>
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

        {flowState === "delete-deleting" && (
          <div className="transfer-overlay transfer-overlay--pending">
            <span
              className="payee-spinner"
              style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
            />
            <span className="transfer-overlay__message">Deleting...</span>
          </div>
        )}

        {flowState === "delete-success" && (
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
                setError(null);
                setFlowState("detail");
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  // Detail view
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <h2 className="space-form__title" style={{ margin: 0 }}>
            Recurring Transfer to {selectedSpace?.name}
          </h2>
          {!recurringTransfer ? (
            <button
              className="payee-action-add"
              onClick={() => setFlowState("setup-form")}
              type="button"
              title="Set up recurring transfer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          ) : (
            <button
              className="payee-action-add"
              style={{ background: "#dc2626" }}
              onClick={() => setFlowState("delete-confirm")}
              type="button"
              title="Delete recurring transfer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>

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
