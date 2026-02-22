import "@/index.css";

import { useEffect, useState } from "react";
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

interface SpaceInfo {
  name: string;
  savingsGoalUid: string;
  state: string;
  totalSaved: MinorUnitsAmount;
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

function GetSpaceTransactions() {
  const { output } = useToolInfo<"get-space-transactions">();
  const { callToolAsync } = useCallTool("get-space");

  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [spaceImage, setSpaceImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (output?.accountUid && output?.spaceUid) {
      callToolAsync({
        accountUid: output.accountUid,
        spaceUid: output.spaceUid,
      })
        .then((res) => {
          const data = res.structuredContent as unknown as SpaceInfo | undefined;
          if (data) setSpaceInfo(data);
          const images = (res as unknown as { meta?: { images?: Record<string, string> } }).meta?.images;
          if (images && data?.savingsGoalUid) {
            setSpaceImage(images[data.savingsGoalUid]);
          }
        })
        .catch(() => {});
    }
  }, [output?.accountUid, output?.spaceUid]);

  if (!output) {
    return (
      <div className="space-container">
        <div className="space-loading">Loading transactions...</div>
      </div>
    );
  }

  const feedItems: FeedItem[] = output.feedItems ?? [];

  return (
    <div className="space-container">
      {spaceInfo && (
        <div className="space-transactions-header">
          {spaceImage ? (
            <img
              src={spaceImage}
              className="space-transactions-header__photo"
              alt={spaceInfo.name}
            />
          ) : (
            <div className="space-transactions-header__photo-initials">
              {spaceInfo.name[0]}
            </div>
          )}
          <div className="space-transactions-header__info">
            <span className="space-transactions-header__name">
              {spaceInfo.name}
            </span>
            <span className="space-transactions-header__saved">
              {formatAmount(
                spaceInfo.totalSaved.currency,
                spaceInfo.totalSaved.minorUnits
              )}
            </span>
          </div>
        </div>
      )}

      <span className="space-transactions-header__count">
        {feedItems.length} transaction{feedItems.length !== 1 ? "s" : ""}
      </span>

      {feedItems.length === 0 ? (
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

export default GetSpaceTransactions;
mountWidget(<GetSpaceTransactions />);
