import "@/index.css";

import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

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

function SpacePhoto({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  if (image) {
    return <img src={image} className="space-card__photo" alt={name} />;
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
  if (image) {
    return <img src={image} className="space-list-item__photo" alt={name} />;
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
  onViewTransactions,
  onBack,
}: {
  space: Space & { accountUid: string };
  image?: string;
  onViewTransactions: () => void;
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
    </div>
  );
}

function CreateSpaceForm({
  accounts,
  onBack,
}: {
  accounts: Account[];
  onBack: () => void;
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
      onSuccess: () => {
        sendFollowUp(
          `[Create Space Form] The user created a new space "${name}" successfully.`
        );
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

function GetSpaces() {
  const { output, responseMetadata } = useToolInfo<"get-spaces">();
  const images = responseMetadata?.images as
    | Record<string, string>
    | undefined;

  const [view, setView] = useState<"list" | "detail" | "transactions" | "create">("list");
  const [selectedSpace, setSelectedSpace] = useState<(Space & { accountUid: string }) | null>(null);

  const transactions = useCallTool("get-space-transactions");

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

  if (!output) {
    return (
      <div className="space-container">
        <div className="space-loading">Loading spaces...</div>
      </div>
    );
  }

  const accounts: Account[] = output.accounts ?? [];

  if (view === "create") {
    return (
      <div className="space-container">
        <CreateSpaceForm
          accounts={accounts}
          onBack={() => setView("list")}
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
          onViewTransactions={openTransactions}
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
