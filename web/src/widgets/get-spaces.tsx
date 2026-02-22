import "@/index.css";

import { useState, useCallback, useEffect } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";
import binIcon from "../assets/bin.svg";

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface FeedItem {
  feedItemUid: string;
  direction: "IN" | "OUT";
  amount: MinorUnitsAmount;
  counterPartyName?: string;
  reference?: string;
  transactionTime?: string;
  spendingCategory?: string;
}

interface Space {
  savingsGoalUid: string;
  name: string;
  state: string;
  totalSaved: MinorUnitsAmount;
  target?: MinorUnitsAmount;
  savedPercentage?: number;
}

interface Account {
  accountUid: string;
  name: string;
  currency: string;
  accountType: string;
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

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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

function SpacePhoto({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  if (image && !failed) {
    return <img src={image} className="space-card__photo" alt={name} onError={onError} />;
  }
  return <div className="space-card__photo-initials">{name[0]}</div>;
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
    return <img src={image} className="space-list-item__photo" alt={name} onError={onError} />;
  }
  return <div className="space-list-item__photo-initials">{name[0]}</div>;
}

function TransactionCard({
  item,
  index,
}: {
  item: FeedItem;
  index: number;
}) {
  const isIn = item.direction === "IN";
  const label = item.reference || item.counterPartyName || item.direction;
  const dateStr = item.transactionTime;

  return (
    <div
      className="space-transaction"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`space-transaction__direction space-transaction__direction--${isIn ? "in" : "out"}`}
      >
        {isIn ? "\u25B2" : "\u25BC"}
      </div>
      <div className="space-transaction__info">
        <span className="space-transaction__reference">{label}</span>
        {dateStr && (
          <span className="space-transaction__date">
            {formatDateTime(dateStr)}
          </span>
        )}
        {item.spendingCategory && (
          <span className="space-transaction__category">
            {item.spendingCategory.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <span
        className={`space-transaction__amount space-transaction__amount--${isIn ? "in" : "out"}`}
      >
        {isIn ? "+" : "-"}
        {formatAmount(item.amount.currency, item.amount.minorUnits)}
      </span>
    </div>
  );
}

function TransactionsView({
  spaceName,
  data,
  isPending,
  onBack,
}: {
  spaceName: string;
  data: { feedItems: FeedItem[] } | null;
  isPending: boolean;
  onBack: () => void;
}) {
  const feedItems = data?.feedItems ?? [];

  return (
    <div className="space-transactions-list">
      <button className="payee-form__back" onClick={onBack}>
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
      <div className="payments-header">
        <span className="payments-header__title">{spaceName}</span>
        {!isPending && (
          <span className="payments-header__subtitle">
            {feedItems.length} transaction{feedItems.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {isPending ? (
        <div className="space-loading">Loading transactions...</div>
      ) : feedItems.length === 0 ? (
        <div className="space-empty">No transactions found</div>
      ) : (
        feedItems.map((item, i) => (
          <TransactionCard
            key={item.feedItemUid ?? i}
            item={item}
            index={i}
          />
        ))
      )}
    </div>
  );
}

function SpaceCard({
  space,
  image,
  recurringTransfer,
  onViewTransactions,
  onSetupRecurring,
  onDeleteRecurring,
  onDeleteSpace,
  onBack,
}: {
  space: Space & { accountUid: string };
  image?: string;
  recurringTransfer: RecurringTransfer | null;
  onViewTransactions: () => void;
  onSetupRecurring: () => void;
  onDeleteRecurring: () => void;
  onDeleteSpace: () => void;
  onBack: () => void;
}) {
  const hasTarget = space.target && space.target.minorUnits > 0;
  const percentage =
    space.savedPercentage ??
    (hasTarget
      ? Math.min(
          Math.round(
            (space.totalSaved.minorUnits / space.target!.minorUnits) * 100
          ),
          100
        )
      : null);

  return (
    <div className="space-card">
      <button className="payee-form__back" onClick={onBack}>
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

      <div className="space-card__header">
        <SpacePhoto name={space.name} image={image} />
        <span className="space-card__name">{space.name}</span>
        <span
          className={`space-card__state-badge${space.state === "ACTIVE" ? " space-card__state-badge--active" : ""}`}
        >
          {space.state}
        </span>
        <button
          className="payee-action-add"
          style={{ background: "#dc2626", marginLeft: "auto" }}
          onClick={onDeleteSpace}
          type="button"
          title="Delete space"
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
      </div>

      <div className="space-card__amounts">
        <div className="space-card__saved">
          {formatAmount(
            space.totalSaved.currency,
            space.totalSaved.minorUnits
          )}
        </div>
        {hasTarget && (
          <div className="space-card__target">
            Target:{" "}
            {formatAmount(space.target!.currency, space.target!.minorUnits)}
          </div>
        )}
        {percentage !== null && (
          <>
            <div className="space-card__progress">
              <div
                className="space-card__progress-bar"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="space-card__percentage">{percentage}%</span>
          </>
        )}
      </div>

      <div className="space-card__actions">
        <button
          className="space-action-btn space-action-btn--text"
          onClick={onViewTransactions}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          View Transactions
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginTop: "0.75rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Recurring Transfer
        </h3>
        {!recurringTransfer ? (
          <button
            className="payee-action-add"
            onClick={onSetupRecurring}
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
            onClick={onDeleteRecurring}
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
              <span className="recurring-transfer-card__label">Payments</span>
              <span className="recurring-transfer-card__value">
                {recurringTransfer.recurrenceRule.count} total
              </span>
            </div>
          )}
          {recurringTransfer.reference && (
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">Reference</span>
              <span className="recurring-transfer-card__value">
                {recurringTransfer.reference}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            padding: "0.5rem 0",
          }}
        >
          No recurring transfer set up
        </div>
      )}
    </div>
  );
}

function CreateSpaceForm({
  accounts,
  onBack,
  onCreated,
}: {
  accounts: Account[];
  onBack: () => void;
  onCreated?: (accountUid: string, space: Space) => void;
}) {
  const sendFollowUp = useSendFollowUpMessage();

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [hasTarget, setHasTarget] = useState(false);
  const [targetAmount, setTargetAmount] = useState(0);

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const {
    callTool: callCreate,
    isPending: isCreating,
    isSuccess: createSuccess,
  } = useCallTool("create-space");

  const handleSelectAccount = (account: Account) => {
    setSelectedAccount(account);
    if (!currency) {
      setCurrency(account.currency);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoDataUrl(dataUrl);
      const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(null);
    setPhotoDataUrl(null);
  };

  const handleSubmit = () => {
    if (!selectedAccount) return;

    const params: Record<string, unknown> = {
      accountUid: selectedAccount.accountUid,
      name,
      currency,
    };
    if (hasTarget && targetAmount > 0) {
      params.target = {
        currency,
        minorUnits: Math.round(targetAmount * 100),
      };
    }
    if (photoBase64) {
      params.base64EncodedPhoto = photoBase64;
    }
    callCreate(params as Parameters<typeof callCreate>[0], {
      onSuccess: (data) => {
        sendFollowUp(
          `[Create Space Form] The user created a new space "${name}" successfully.`
        );
        const sc = data?.structuredContent as
          | { savingsGoalUid?: string; name?: string; currency?: string; target?: MinorUnitsAmount }
          | undefined;
        if (sc?.savingsGoalUid && onCreated) {
          onCreated(selectedAccount!.accountUid, {
            savingsGoalUid: sc.savingsGoalUid,
            name: sc.name ?? name,
            state: "ACTIVE",
            totalSaved: { currency: sc.currency ?? currency, minorUnits: 0 },
            target: sc.target,
            savedPercentage: 0,
          });
        }
      },
    });
  };

  if (!selectedAccount) {
    return (
      <div className="space-form">
        <button className="payee-form__back" onClick={onBack} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <h2 className="space-form__title">Select Account</h2>

        {accounts.length === 0 ? (
          <div style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "1rem" }}>
            No accounts found
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.accountUid}
              className="space-account-card"
              onClick={() => handleSelectAccount(account)}
            >
              <div className="space-account-card__info">
                <span className="space-account-card__name">
                  {account.name}
                </span>
                <span className="space-account-card__balance">
                  {account.currency}
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
                style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-form">
      <button
        className="payee-form__back"
        onClick={() => setSelectedAccount(null)}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h2 className="space-form__title">Create Space</h2>

      <div className="space-form__group">
        <label className="space-form__label">Name</label>
        <input
          className="space-form__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Holiday Fund"
          required
        />
      </div>

      <div className="space-form__group">
        <label className="space-form__label">Currency</label>
        <input
          className="space-form__input"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
          placeholder="GBP"
        />
      </div>

      <div className="space-form__group">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={hasTarget}
            onChange={(e) => setHasTarget(e.target.checked)}
            style={{ accentColor: "var(--color-accent)" }}
          />
          Set a savings target
        </label>
      </div>

      {hasTarget && (
        <div className="space-form__group">
          <label className="space-form__label">Target Amount</label>
          <input
            className="space-form__input"
            type="number"
            min="0"
            step="0.01"
            value={targetAmount || ""}
            onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      )}

      <div className="space-form__group">
        <label className="space-form__label">Photo (optional)</label>
        {photoDataUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img
              className="space-form__photo-preview"
              src={photoDataUrl}
              alt="Space photo preview"
            />
            <button
              className="space-form__photo-remove"
              onClick={handleRemovePhoto}
              type="button"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            className="space-form__photo-upload"
            onClick={() =>
              document.getElementById("spaces-photo-input")?.click()
            }
          >
            Click to upload a photo
          </div>
        )}
        <input
          id="spaces-photo-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          style={{ display: "none" }}
        />
      </div>

      <button
        className={`space-form__submit${createSuccess ? " space-form__submit--success" : ""}`}
        onClick={handleSubmit}
        disabled={isCreating || !name || !currency}
      >
        {isCreating && <span className="payee-spinner" />}
        {createSuccess ? "Space Created" : "Create Space"}
      </button>
    </div>
  );
}

type ViewState =
  | "list"
  | "detail"
  | "transactions"
  | "create"
  | "rt-setup-form"
  | "rt-setup-submitting"
  | "rt-setup-success"
  | "rt-delete-confirm"
  | "rt-delete-deleting"
  | "rt-delete-success"
  | "space-delete-confirm"
  | "space-delete-deleting"
  | "space-delete-success";

function GetSpaces() {
  const { output, responseMetadata } = useToolInfo<"get-spaces">();
  const images = responseMetadata?.images as
    | Record<string, string>
    | undefined;
  const sendFollowUp = useSendFollowUpMessage();

  const [view, setView] = useState<ViewState>("list");
  const [selectedSpace, setSelectedSpace] = useState<(Space & { accountUid: string }) | null>(null);
  const [transfers, setTransfers] = useState<Record<string, RecurringTransfer>>({});
  const [localAccounts, setLocalAccounts] = useState<Account[] | null>(null);
  const [spaceDeleteError, setSpaceDeleteError] = useState<string | null>(null);

  const transactions = useCallTool("get-space-transactions");
  const { callToolAsync: doSetup } = useCallTool(
    "setup-recurring-transfer-to-space-internal",
  );
  const { callToolAsync: doDelete } = useCallTool(
    "delete-recurring-transfer-to-space-internal",
  );
  const { callToolAsync: doDeleteSpace } = useCallTool("delete-space");

  // Setup form state
  const [rtAmount, setRtAmount] = useState("");
  const [rtFrequency, setRtFrequency] = useState<Frequency>("MONTHLY");
  const [rtStartDate, setRtStartDate] = useState(todayISO());
  const [rtInterval, setRtInterval] = useState("1");
  const [rtDays, setRtDays] = useState<DayOfWeek[]>([]);
  const [rtEndCondition, setRtEndCondition] = useState<EndCondition>("none");
  const [rtCount, setRtCount] = useState("");
  const [rtUntilDate, setRtUntilDate] = useState("");
  const [rtReference, setRtReference] = useState("");
  const [rtError, setRtError] = useState<string | null>(null);

  useEffect(() => {
    if (output?.recurringTransfers) {
      setTransfers(
        output.recurringTransfers as Record<string, RecurringTransfer>,
      );
    }
  }, [output?.recurringTransfers]);

  useEffect(() => {
    if (output?.accounts) {
      setLocalAccounts(output.accounts as Account[]);
    }
  }, [output?.accounts]);

  const handleSpaceCreated = useCallback(
    (accountUid: string, space: Space) => {
      setLocalAccounts((prev) => {
        if (!prev) return prev;
        return prev.map((a) =>
          a.accountUid === accountUid
            ? { ...a, spaces: [...a.spaces, space] }
            : a,
        );
      });
      setView("list");
    },
    [],
  );

  const handleDeleteSpace = async () => {
    if (!selectedSpace) return;

    setView("space-delete-deleting");
    setSpaceDeleteError(null);

    try {
      await doDeleteSpace({
        accountUid: selectedSpace.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
      });

      setLocalAccounts((prev) => {
        if (!prev) return prev;
        return prev.map((a) =>
          a.accountUid === selectedSpace.accountUid
            ? {
                ...a,
                spaces: a.spaces.filter(
                  (s) => s.savingsGoalUid !== selectedSpace.savingsGoalUid,
                ),
              }
            : a,
        );
      });
      setTransfers((prev) => {
        const next = { ...prev };
        delete next[selectedSpace.savingsGoalUid];
        return next;
      });
      setView("space-delete-success");
      sendFollowUp(
        `[Delete Space] The user deleted the space "${selectedSpace.name}".`,
      );
    } catch {
      setSpaceDeleteError("Failed to delete space. Please try again.");
      setView("space-delete-confirm");
    }
  };

  const resetSetupForm = () => {
    setRtAmount("");
    setRtFrequency("MONTHLY");
    setRtStartDate(todayISO());
    setRtInterval("1");
    setRtDays([]);
    setRtEndCondition("none");
    setRtCount("");
    setRtUntilDate("");
    setRtReference("");
    setRtError(null);
  };

  const toggleDay = (day: DayOfWeek) => {
    setRtDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const openDetail = (space: Space, accountUid: string) => {
    setSelectedSpace({ ...space, accountUid });
    setView("detail");
  };

  const openTransactions = () => {
    if (!selectedSpace) return;
    setView("transactions");
    transactions.callTool({
      accountUid: selectedSpace.accountUid,
      spaceUid: selectedSpace.savingsGoalUid,
    });
  };

  const handleSetup = async () => {
    if (!selectedSpace || !rtAmount) return;

    const currency = selectedSpace.totalSaved.currency;
    const minorUnits = Math.round(parseFloat(rtAmount) * 100);
    if (minorUnits <= 0) return;

    setView("rt-setup-submitting");
    setRtError(null);

    const recurrenceRule: Record<string, unknown> = {
      startDate: rtStartDate,
      frequency: rtFrequency,
    };
    const intervalNum = parseInt(rtInterval, 10);
    if (intervalNum > 1) recurrenceRule.interval = intervalNum;
    if (rtFrequency === "WEEKLY" && rtDays.length > 0)
      recurrenceRule.days = rtDays;
    if (rtEndCondition === "count" && rtCount)
      recurrenceRule.count = parseInt(rtCount, 10);
    if (rtEndCondition === "until" && rtUntilDate)
      recurrenceRule.untilDate = rtUntilDate;

    try {
      await doSetup({
        accountUid: selectedSpace.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
        amount: { currency, minorUnits },
        recurrenceRule: recurrenceRule as {
          startDate: string;
          frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
        },
        ...(rtReference ? { reference: rtReference } : {}),
      });

      setTransfers((prev) => ({
        ...prev,
        [selectedSpace.savingsGoalUid]: {
          transferUid: "new",
          recurrenceRule: {
            startDate: rtStartDate,
            frequency: rtFrequency,
            ...(intervalNum > 1 ? { interval: intervalNum } : {}),
            ...(rtFrequency === "WEEKLY" && rtDays.length > 0
              ? { days: [...rtDays] }
              : {}),
            ...(rtEndCondition === "count" && rtCount
              ? { count: parseInt(rtCount, 10) }
              : {}),
            ...(rtEndCondition === "until" && rtUntilDate
              ? { untilDate: rtUntilDate }
              : {}),
          },
          currencyAndAmount: { currency, minorUnits },
          ...(rtReference ? { reference: rtReference } : {}),
        },
      }));
      setView("rt-setup-success");
      sendFollowUp(
        `[Recurring Transfer] The user set up a recurring transfer of ${formatAmount(currency, minorUnits)} ${describeFrequencyParams(rtFrequency, intervalNum, rtDays).toLowerCase()} to the space "${selectedSpace.name}"${rtReference ? ` with reference "${rtReference}"` : ""}.`,
      );
    } catch {
      setRtError("Failed to set up recurring transfer. Please try again.");
      setView("rt-setup-form");
    }
  };

  const handleDelete = async () => {
    if (!selectedSpace) return;

    setView("rt-delete-deleting");
    setRtError(null);

    try {
      await doDelete({
        accountUid: selectedSpace.accountUid,
        spaceUid: selectedSpace.savingsGoalUid,
      });

      setTransfers((prev) => {
        const next = { ...prev };
        delete next[selectedSpace.savingsGoalUid];
        return next;
      });
      setView("rt-delete-success");
      sendFollowUp(
        `[Delete Recurring Transfer] The user deleted the recurring transfer to the space "${selectedSpace.name}".`,
      );
    } catch {
      setRtError("Failed to delete recurring transfer. Please try again.");
      setView("rt-delete-confirm");
    }
  };

  if (!output) {
    return (
      <div className="space-container">
        <div className="space-loading">Loading spaces...</div>
      </div>
    );
  }

  const accounts: Account[] = localAccounts ?? (output.accounts as Account[] ?? []);

  if (view === "create") {
    return (
      <div className="space-container">
        <CreateSpaceForm
          accounts={accounts}
          onBack={() => setView("list")}
          onCreated={handleSpaceCreated}
        />
      </div>
    );
  }

  if (view === "detail" && selectedSpace) {
    return (
      <div className="space-container">
        <SpaceCard
          space={selectedSpace}
          image={images?.[selectedSpace.savingsGoalUid]}
          recurringTransfer={transfers[selectedSpace.savingsGoalUid] ?? null}
          onViewTransactions={openTransactions}
          onSetupRecurring={() => setView("rt-setup-form")}
          onDeleteRecurring={() => setView("rt-delete-confirm")}
          onDeleteSpace={() => setView("space-delete-confirm")}
          onBack={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "transactions" && selectedSpace) {
    return (
      <div className="space-container">
        <TransactionsView
          spaceName={selectedSpace.name}
          data={
            (transactions.data?.structuredContent as unknown as {
              feedItems: FeedItem[];
            }) ?? null
          }
          isPending={transactions.isPending}
          onBack={() => setView("detail")}
        />
      </div>
    );
  }

  // Setup form
  if (
    (view === "rt-setup-form" ||
      view === "rt-setup-submitting" ||
      view === "rt-setup-success") &&
    selectedSpace
  ) {
    const currency = selectedSpace.totalSaved.currency;
    const intervalNum = parseInt(rtInterval, 10) || 1;

    return (
      <div className="space-container" style={{ position: "relative" }}>
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              resetSetupForm();
              setView("detail");
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
            Set Up Recurring Transfer to {selectedSpace.name}
          </h2>

          {rtError && (
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
              <span>{rtError}</span>
            </div>
          )}

          <div className="space-form__group">
            <label className="space-form__label">Amount ({currency})</label>
            <input
              className="space-form__input"
              type="number"
              min="0.01"
              step="0.01"
              value={rtAmount}
              onChange={(e) => setRtAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-form__group">
            <label className="space-form__label">Frequency</label>
            <select
              className="space-form__select"
              value={rtFrequency}
              onChange={(e) => setRtFrequency(e.target.value as Frequency)}
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
              value={rtStartDate}
              onChange={(e) => setRtStartDate(e.target.value)}
            />
          </div>

          <div className="space-form__group">
            <label className="space-form__label">
              Every {rtInterval || "1"} {FREQ_UNITS[rtFrequency]}
            </label>
            <input
              className="space-form__input"
              type="number"
              min="1"
              value={rtInterval}
              onChange={(e) => setRtInterval(e.target.value)}
            />
          </div>

          {rtFrequency === "WEEKLY" && (
            <div className="space-form__group">
              <label className="space-form__label">Days of Week</label>
              <div className="day-pills">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`day-pill${rtDays.includes(day) ? " day-pill--active" : ""}`}
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
                  name="rtEndCondition"
                  checked={rtEndCondition === "none"}
                  onChange={() => setRtEndCondition("none")}
                />
                No end date
              </label>
              <label className="end-condition-option">
                <input
                  type="radio"
                  name="rtEndCondition"
                  checked={rtEndCondition === "count"}
                  onChange={() => setRtEndCondition("count")}
                />
                After N payments
              </label>
              {rtEndCondition === "count" && (
                <input
                  className="space-form__input"
                  type="number"
                  min="1"
                  value={rtCount}
                  onChange={(e) => setRtCount(e.target.value)}
                  placeholder="Number of payments"
                />
              )}
              <label className="end-condition-option">
                <input
                  type="radio"
                  name="rtEndCondition"
                  checked={rtEndCondition === "until"}
                  onChange={() => setRtEndCondition("until")}
                />
                Until date
              </label>
              {rtEndCondition === "until" && (
                <input
                  className="space-form__input"
                  type="date"
                  value={rtUntilDate}
                  onChange={(e) => setRtUntilDate(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="space-form__group">
            <label className="space-form__label">Reference (optional)</label>
            <input
              className="space-form__input"
              value={rtReference}
              onChange={(e) => setRtReference(e.target.value.slice(0, 100))}
              placeholder="e.g. Monthly savings"
              maxLength={100}
            />
          </div>

          <button
            className="space-form__submit"
            onClick={handleSetup}
            disabled={!rtAmount || parseFloat(rtAmount) <= 0}
          >
            Set Up Recurring Transfer
          </button>
        </div>

        {view === "rt-setup-submitting" && (
          <div className="transfer-overlay transfer-overlay--pending">
            <span
              className="payee-spinner"
              style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
            />
            <span className="transfer-overlay__message">Setting up...</span>
          </div>
        )}

        {view === "rt-setup-success" && (
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
                  Math.round(parseFloat(rtAmount) * 100),
                )}
              </span>
              <span
                style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
              >
                {describeFrequencyParams(rtFrequency, intervalNum, rtDays).toLowerCase()}{" "}
                to {selectedSpace.name}
              </span>
              {rtReference && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.7)",
                    fontStyle: "italic",
                  }}
                >
                  {rtReference}
                </span>
              )}
            </div>
            <button
              className="transfer-overlay__done"
              onClick={() => {
                resetSetupForm();
                setView("detail");
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  // Delete confirmation
  if (
    (view === "rt-delete-confirm" ||
      view === "rt-delete-deleting" ||
      view === "rt-delete-success") &&
    selectedSpace
  ) {
    const currentTransfer = transfers[selectedSpace.savingsGoalUid] ?? null;

    return (
      <div className="space-container" style={{ position: "relative" }}>
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              setRtError(null);
              setView("detail");
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
            Delete Recurring Transfer to {selectedSpace.name}
          </h2>

          {rtError && (
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
              <span>{rtError}</span>
            </div>
          )}

          {currentTransfer && (
            <div className="recurring-transfer-card">
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">Amount</span>
                <span className="recurring-transfer-card__amount">
                  {formatAmount(
                    currentTransfer.currencyAndAmount.currency,
                    currentTransfer.currencyAndAmount.minorUnits,
                  )}
                </span>
              </div>
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">
                  Frequency
                </span>
                <span className="recurring-transfer-card__value">
                  {describeFrequency(currentTransfer.recurrenceRule)}
                </span>
              </div>
              {currentTransfer.nextPaymentDate && (
                <div className="recurring-transfer-card__row">
                  <span className="recurring-transfer-card__label">
                    Next Payment
                  </span>
                  <span className="recurring-transfer-card__value">
                    {formatDate(currentTransfer.nextPaymentDate)}
                  </span>
                </div>
              )}
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">
                  Start Date
                </span>
                <span className="recurring-transfer-card__value">
                  {formatDate(currentTransfer.recurrenceRule.startDate)}
                </span>
              </div>
              {currentTransfer.reference && (
                <div className="recurring-transfer-card__row">
                  <span className="recurring-transfer-card__label">
                    Reference
                  </span>
                  <span className="recurring-transfer-card__value">
                    {currentTransfer.reference}
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

        {view === "rt-delete-deleting" && (
          <div className="transfer-overlay transfer-overlay--pending">
            <span
              className="payee-spinner"
              style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
            />
            <span className="transfer-overlay__message">Deleting...</span>
          </div>
        )}

        {view === "rt-delete-success" && (
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
                {selectedSpace.name}
              </span>
            </div>
            <button
              className="transfer-overlay__done"
              onClick={() => {
                setRtError(null);
                setView("detail");
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  // Delete space confirmation
  if (
    (view === "space-delete-confirm" ||
      view === "space-delete-deleting" ||
      view === "space-delete-success") &&
    selectedSpace
  ) {
    return (
      <div className="space-container" style={{ position: "relative" }}>
        <div className="space-form">
          <button
            className="payee-form__back"
            onClick={() => {
              setSpaceDeleteError(null);
              setView("detail");
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
            Delete Space &ldquo;{selectedSpace.name}&rdquo;
          </h2>

          {spaceDeleteError && (
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
              <span>{spaceDeleteError}</span>
            </div>
          )}

          <div className="recurring-transfer-card">
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">Balance</span>
              <span className="recurring-transfer-card__amount">
                {formatAmount(
                  selectedSpace.totalSaved.currency,
                  selectedSpace.totalSaved.minorUnits,
                )}
              </span>
            </div>
            {selectedSpace.target && selectedSpace.target.minorUnits > 0 && (
              <div className="recurring-transfer-card__row">
                <span className="recurring-transfer-card__label">Target</span>
                <span className="recurring-transfer-card__value">
                  {formatAmount(
                    selectedSpace.target.currency,
                    selectedSpace.target.minorUnits,
                  )}
                </span>
              </div>
            )}
            <div className="recurring-transfer-card__row">
              <span className="recurring-transfer-card__label">State</span>
              <span className="recurring-transfer-card__value">
                {selectedSpace.state}
              </span>
            </div>
          </div>

          <button
            className="space-form__submit space-form__submit--destructive"
            onClick={handleDeleteSpace}
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
            Delete Space
          </button>
        </div>

        {view === "space-delete-deleting" && (
          <div className="transfer-overlay transfer-overlay--pending">
            <span
              className="payee-spinner"
              style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
            />
            <span className="transfer-overlay__message">Deleting...</span>
          </div>
        )}

        {view === "space-delete-success" && (
          <div className="transfer-overlay transfer-overlay--deleted">
            <img src={binIcon} alt="Deleted" className="transfer-bin-icon" />
            <div className="transfer-overlay__details">
              <span
                style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}
              >
                Space deleted
              </span>
              <span
                style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.9)" }}
              >
                {selectedSpace.name}
              </span>
            </div>
            <button
              className="transfer-overlay__done"
              onClick={() => {
                setSpaceDeleteError(null);
                setSelectedSpace(null);
                setView("list");
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    );
  }

  const totalSpaces = accounts.reduce((sum, a) => sum + a.spaces.length, 0);

  return (
    <div className="space-container">
      <div className="payees-header">
        <span className="payees-header__title">Spaces</span>
        <button className="payee-action-add" onClick={() => setView("create")} title="Add space">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {totalSpaces === 0 ? (
        <div className="payees-empty">
          <span className="payees-empty__text">No spaces found</span>
          <button className="payee-action-add" onClick={() => setView("create")} title="Add space">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      ) : (
        accounts.map((account) => {
          if (account.spaces.length === 0) return null;
          return (
            <div className="spaces-account-group" key={account.accountUid}>
              <div className="spaces-account-group__header">
                <span className="spaces-account-group__name">{account.name}</span>
                <span className="spaces-account-group__type">{account.accountType.replace(/_/g, " ")}</span>
              </div>
              {account.spaces.map((space) => (
                <div
                  className="space-list-item"
                  key={space.savingsGoalUid}
                  onClick={() => openDetail(space, account.accountUid)}
                >
                  <SpaceListPhoto
                    name={space.name}
                    image={images?.[space.savingsGoalUid]}
                  />
                  <div className="space-list-item__info">
                    <span className="space-list-item__name">{space.name}</span>
                    <span className="space-list-item__saved">
                      {formatAmount(space.totalSaved.currency, space.totalSaved.minorUnits)}
                    </span>
                  </div>
                  <span
                    className={`space-card__state-badge${space.state === "ACTIVE" ? " space-card__state-badge--active" : ""}`}
                  >
                    {space.state}
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

export default GetSpaces;
mountWidget(<GetSpaces />);
