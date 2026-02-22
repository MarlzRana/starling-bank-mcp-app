import "@/index.css";

import { useState } from "react";
import { mountWidget } from "skybridge/web";
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
}: {
  space: {
    savingsGoalUid: string;
    name: string;
    state: string;
    totalSaved: MinorUnitsAmount;
    target?: MinorUnitsAmount;
    savedPercentage?: number;
    accountUid: string;
  };
  image?: string;
  onViewTransactions: () => void;
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

function GetSpace() {
  const { output, responseMetadata } = useToolInfo<"get-space">();
  const images = responseMetadata?.images as
    | Record<string, string>
    | undefined;

  const [view, setView] = useState<"detail" | "transactions">("detail");

  const transactions = useCallTool("get-space-transactions");

  const openTransactions = () => {
    if (!output) return;
    setView("transactions");
    transactions.callTool({
      accountUid: output.accountUid,
      spaceUid: output.savingsGoalUid,
    });
  };

  if (!output) {
    return (
      <div className="space-container">
        <div className="space-loading">Loading space...</div>
      </div>
    );
  }

  if (view === "transactions") {
    return (
      <div className="space-container">
        <TransactionsView
          spaceName={output.name}
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

  const spaceImage = images?.[output.savingsGoalUid];

  return (
    <div className="space-container">
      <SpaceCard
        space={output as unknown as Parameters<typeof SpaceCard>[0]["space"]}
        image={spaceImage}
        onViewTransactions={openTransactions}
      />
    </div>
  );
}

export default GetSpace;
mountWidget(<GetSpace />);
