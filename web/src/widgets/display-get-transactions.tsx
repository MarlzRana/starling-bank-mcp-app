import "@/index.css";

import { useMemo, useState, useCallback, useEffect } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

// === Types ===

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface FeedItem {
  feedItemUid: string;
  amount: MinorUnitsAmount;
  direction: "IN" | "OUT";
  transactionTime: string;
  counterPartyName: string;
  spendingCategory: string;
  status: string;
  source: string;
  reference: string;
}

type TimePeriod =
  | "last-2-years"
  | "last-year"
  | "last-3-months"
  | "last-month"
  | "this-month";

type BottomTab = "transactions" | "by-category" | "by-merchant";

interface BarData {
  label: string;
  amount: number;
  startDate: Date;
  endDate: Date;
}

interface AggregateItem {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface StackSegment {
  name: string;
  amount: number;
  color: string;
}

interface StackedBarData {
  label: string;
  startDate: Date;
  endDate: Date;
  total: number;
  stacks: StackSegment[];
}

interface PeriodData {
  period: TimePeriod;
  items: FeedItem[];
  spendingTotal: number;
  bars: BarData[];
  categories: AggregateItem[];
  merchants: AggregateItem[];
  categoryStackedBars: StackedBarData[];
  merchantStackedBars: StackedBarData[];
}

// === Constants ===

const PERIODS: TimePeriod[] = [
  "last-2-years",
  "last-year",
  "last-3-months",
  "last-month",
  "this-month",
];

const PERIOD_LABELS: Record<TimePeriod, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "last-year": "Last year",
  "last-2-years": "Last 2 years",
};

const PIE_COLORS = [
  "#cc785c",
  "#5c8ecc",
  "#5ccc7a",
  "#cc5c8e",
  "#ccb85c",
  "#8e5ccc",
  "#5cccc0",
  "#cc6b5c",
  "#7acc5c",
  "#5c6bcc",
];

// === Helpers ===

function formatAmount(currency: string, minorUnits: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(minorUnits / 100);
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatCategory(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function isSpendingItem(item: FeedItem): boolean {
  return (
    item.direction === "OUT" &&
    item.status !== "REVERSED" &&
    item.status !== "DECLINED"
  );
}

function getPeriodBounds(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (period) {
    case "this-month":
      return { start: new Date(year, month, 1), end: now };
    case "last-month": {
      const lm = month === 0 ? 11 : month - 1;
      const ly = month === 0 ? year - 1 : year;
      return {
        start: new Date(ly, lm, 1),
        end: new Date(ly, lm + 1, 0, 23, 59, 59, 999),
      };
    }
    case "last-3-months":
      return { start: new Date(year, month - 2, 1), end: now };
    case "last-year":
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59, 999),
      };
    case "last-2-years":
      return { start: new Date(year - 1, 0, 1), end: now };
  }
}

function generateWeeklyBars(
  spending: FeedItem[],
  periodStart: Date,
  periodEnd: Date,
): BarData[] {
  const bars: BarData[] = [];
  let day = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    periodStart.getDate(),
  );

  while (day <= periodEnd) {
    const weekStart = new Date(day);
    const rawEnd = new Date(day);
    rawEnd.setDate(rawEnd.getDate() + 6);
    const monthLast = new Date(
      day.getFullYear(),
      day.getMonth() + 1,
      0,
    );
    const last = new Date(
      Math.min(rawEnd.getTime(), monthLast.getTime(), periodEnd.getTime()),
    );

    const s = weekStart.getDate();
    const e = last.getDate();
    const label = s === e ? `${s}` : `${s}-${e}`;
    const rStart = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      s,
    );
    const rEnd = new Date(
      last.getFullYear(),
      last.getMonth(),
      e,
      23,
      59,
      59,
      999,
    );

    const amount = spending
      .filter((item) => {
        const t = new Date(item.transactionTime);
        return t >= rStart && t <= rEnd;
      })
      .reduce((sum, item) => sum + item.amount.minorUnits, 0);

    bars.push({ label, amount, startDate: rStart, endDate: rEnd });
    day = new Date(last.getFullYear(), last.getMonth(), e + 1);
  }
  return bars;
}

function generateMonthlyBars(
  spending: FeedItem[],
  periodStart: Date,
  periodEnd: Date,
): BarData[] {
  const bars: BarData[] = [];
  let cur = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);

  while (cur <= periodEnd) {
    const mStart = new Date(cur);
    const mEnd = new Date(
      cur.getFullYear(),
      cur.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const cEnd = mEnd > periodEnd ? periodEnd : mEnd;
    const label = mStart.toLocaleDateString(undefined, { month: "short" });

    const amount = spending
      .filter((item) => {
        const t = new Date(item.transactionTime);
        return t >= mStart && t <= cEnd;
      })
      .reduce((sum, item) => sum + item.amount.minorUnits, 0);

    bars.push({ label, amount, startDate: mStart, endDate: cEnd });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return bars;
}

function aggregate(
  items: FeedItem[],
  keyFn: (item: FeedItem) => string,
): AggregateItem[] {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = totals.get(key) || { amount: 0, count: 0 };
    totals.set(key, {
      amount: existing.amount + item.amount.minorUnits,
      count: existing.count + 1,
    });
  }

  const total =
    items.reduce((sum, item) => sum + item.amount.minorUnits, 0) || 1;
  return Array.from(totals.entries())
    .map(([name, data], i) => ({
      name,
      amount: data.amount,
      count: data.count,
      percentage: (data.amount / total) * 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
}

function generateStackedBars(
  bars: BarData[],
  spending: FeedItem[],
  colorMap: Map<string, string>,
  keyFn: (item: FeedItem) => string,
): StackedBarData[] {
  return bars.map((bar) => {
    const itemsInRange = spending.filter((item) => {
      const t = new Date(item.transactionTime);
      return t >= bar.startDate && t <= bar.endDate;
    });

    const groups = new Map<string, number>();
    for (const item of itemsInRange) {
      const key = keyFn(item);
      groups.set(key, (groups.get(key) || 0) + item.amount.minorUnits);
    }

    const stacks: StackSegment[] = Array.from(groups.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        color: colorMap.get(name) || "#999",
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      label: bar.label,
      startDate: bar.startDate,
      endDate: bar.endDate,
      total: stacks.reduce((sum, s) => sum + s.amount, 0),
      stacks,
    };
  });
}

// === Sub-components ===

function BarChart({
  bars,
  onBarHover,
  onBarLeave,
}: {
  bars: BarData[];
  onBarHover: (bar: BarData, rect: DOMRect) => void;
  onBarLeave: () => void;
}) {
  const maxAmount = Math.max(...bars.map((b) => b.amount), 1);

  if (bars.length === 0) {
    return <div className="space-empty">No spending data</div>;
  }

  return (
    <div className="txn-chart__bars">
      {bars.map((bar, i) => {
        const heightPct = (bar.amount / maxAmount) * 100;
        return (
          <div
            key={`${bar.label}-${i}`}
            className="txn-chart__bar-wrapper"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onBarHover(bar, rect);
            }}
            onMouseLeave={onBarLeave}
          >
            <div
              className="txn-chart__bar"
              style={{
                height: `${Math.max(heightPct, 2)}%`,
                animationDelay: `${i * 0.04}s`,
              }}
            />
            <span className="txn-chart__bar-label">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StackedBarChart({
  bars,
  focusedName,
  onSegmentHover,
  onSegmentLeave,
  onSegmentClick,
}: {
  bars: StackedBarData[];
  focusedName: string | null;
  onSegmentHover: (
    barIndex: number,
    name: string,
    amount: number,
    barLabel: string,
    startDate: Date,
    rect: DOMRect,
  ) => void;
  onSegmentLeave: () => void;
  onSegmentClick: (barIndex: number, name: string) => void;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<{
    barIndex: number;
    name: string;
  } | null>(null);

  const maxTotal = Math.max(...bars.map((b) => b.total), 1);

  if (bars.length === 0 || bars.every((b) => b.total === 0)) {
    return <div className="space-empty">No spending data</div>;
  }

  const anyHighlighted = focusedName !== null || hoveredSegment !== null;

  return (
    <div className="txn-chart__bars">
      {bars.map((bar, barIndex) => {
        const heightPct = (bar.total / maxTotal) * 100;
        return (
          <div
            key={`${bar.label}-${barIndex}`}
            className="txn-chart__bar-wrapper"
          >
            <div
              className="txn-stacked-bar"
              style={{
                height: `${Math.max(heightPct, 2)}%`,
                animationDelay: `${barIndex * 0.04}s`,
              }}
            >
              {bar.stacks.map((stack) => {
                const segHeightPct =
                  bar.total > 0 ? (stack.amount / bar.total) * 100 : 0;

                const isHoveredSegment =
                  hoveredSegment?.barIndex === barIndex &&
                  hoveredSegment?.name === stack.name;
                const isFocusedByList = focusedName === stack.name;
                const isHighlighted = isHoveredSegment || isFocusedByList;
                const isDimmed = anyHighlighted && !isHighlighted;

                return (
                  <div
                    key={stack.name}
                    className={`txn-stacked-bar__segment${isHighlighted ? " txn-stacked-bar__segment--focused" : ""}${isDimmed ? " txn-stacked-bar__segment--dimmed" : ""}`}
                    style={{
                      height: `${Math.max(segHeightPct, 0.5)}%`,
                      background: stack.color,
                    }}
                    onMouseEnter={(e) => {
                      setHoveredSegment({ barIndex, name: stack.name });
                      const rect =
                        e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                      onSegmentHover(
                        barIndex,
                        stack.name,
                        stack.amount,
                        bar.label,
                        bar.startDate,
                        rect,
                      );
                    }}
                    onMouseLeave={() => {
                      setHoveredSegment(null);
                      onSegmentLeave();
                    }}
                    onClick={() => onSegmentClick(barIndex, stack.name)}
                  />
                );
              })}
            </div>
            <span className="txn-chart__bar-label">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TransactionCard({
  item,
  index,
}: {
  item: FeedItem;
  index: number;
}) {
  const isIn = item.direction === "IN";
  const label = item.counterPartyName || item.reference || item.direction;
  const isPending = item.status === "PENDING";

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
        <span className="space-transaction__reference">
          {label}
          {isPending && (
            <span className="txn-pending-badge">PENDING</span>
          )}
        </span>
        {item.transactionTime && (
          <span className="space-transaction__date">
            {formatDateTime(item.transactionTime)}
          </span>
        )}
        {item.spendingCategory && (
          <span className="space-transaction__category">
            {formatCategory(item.spendingCategory)}
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

function AggregateCard({
  item,
  index,
  isFocused,
  currency,
  showAvatar,
  onHover,
  onLeave,
}: {
  item: AggregateItem;
  index: number;
  isFocused: boolean;
  currency: string;
  showAvatar: boolean;
  onHover: (name: string) => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={`txn-aggregate-card${isFocused ? " txn-aggregate-card--focused" : ""}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onMouseEnter={() => onHover(item.name)}
      onMouseLeave={onLeave}
    >
      {showAvatar ? (
        <div
          className="txn-merchant-avatar"
          style={{ background: item.color }}
        >
          {item.name[0]}
        </div>
      ) : (
        <div className="txn-color-dot" style={{ background: item.color }} />
      )}
      <div className="txn-aggregate-card__info">
        <span className="txn-aggregate-card__name">
          {showAvatar ? item.name : formatCategory(item.name)}
        </span>
        <span className="txn-aggregate-card__meta">
          {item.count} txn{item.count !== 1 ? "s" : ""} &middot;{" "}
          {item.percentage.toFixed(1)}%
        </span>
        <div className="txn-aggregate-card__bar-track">
          <div
            className="txn-aggregate-card__bar-fill"
            style={{ width: `${item.percentage}%`, background: item.color }}
          />
        </div>
      </div>
      <span className="txn-aggregate-card__amount">
        {formatAmount(currency, item.amount)}
      </span>
    </div>
  );
}

// === Main Widget ===

function DisplayGetTransactions() {
  const { output } = useToolInfo<"display-get-transactions">();
  const [activeIndex, setActiveIndex] = useState(4);
  const [activeTab, setActiveTab] = useState<BottomTab>("transactions");
  const [focusedName, setFocusedName] = useState<string | null>(null);
  const [_clickedSegment, setClickedSegment] = useState<{
    barIndex: number;
    name: string;
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const feedItems: FeedItem[] = output?.feedItems ?? [];
  const currency = output?.accountCurrency ?? "GBP";

  const allPeriodData = useMemo<PeriodData[]>(() => {
    return PERIODS.map((period) => {
      const { start, end } = getPeriodBounds(period);
      const items = feedItems.filter((item) => {
        const t = new Date(item.transactionTime);
        return t >= start && t <= end;
      });
      const spending = items.filter(isSpendingItem);
      const spendingTotal = spending.reduce(
        (sum, item) => sum + item.amount.minorUnits,
        0,
      );

      const bars =
        period === "this-month" || period === "last-month"
          ? generateWeeklyBars(spending, start, end)
          : generateMonthlyBars(spending, start, end);

      const categories = aggregate(
        spending,
        (item) => item.spendingCategory || "UNCATEGORISED",
      );
      const merchants = aggregate(
        spending,
        (item) => item.counterPartyName || "Unknown",
      );

      const categoryColorMap = new Map(
        categories.map((c) => [c.name, c.color]),
      );
      const merchantColorMap = new Map(
        merchants.map((m) => [m.name, m.color]),
      );

      const categoryStackedBars = generateStackedBars(
        bars,
        spending,
        categoryColorMap,
        (item) => item.spendingCategory || "UNCATEGORISED",
      );
      const merchantStackedBars = generateStackedBars(
        bars,
        spending,
        merchantColorMap,
        (item) => item.counterPartyName || "Unknown",
      );

      return {
        period,
        items,
        spendingTotal,
        bars,
        categories,
        merchants,
        categoryStackedBars,
        merchantStackedBars,
      };
    });
  }, [feedItems]);

  const activePeriodData = allPeriodData[activeIndex];

  // Sort transactions by date, most recent first
  const sortedItems = useMemo(
    () =>
      [...activePeriodData.items].sort(
        (a, b) =>
          new Date(b.transactionTime).getTime() -
          new Date(a.transactionTime).getTime(),
      ),
    [activePeriodData.items],
  );

  // Reset state on period/tab change
  useEffect(() => {
    setFocusedName(null);
    setClickedSegment(null);
    setTooltip(null);
  }, [activeIndex, activeTab]);

  const handleBarHover = useCallback(
    (bar: BarData, rect: DOMRect) => {
      const month = bar.startDate.toLocaleDateString(undefined, {
        month: "short",
      });
      setTooltip({
        text: `${formatAmount(currency, bar.amount)} | ${bar.label} ${month}`,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    [currency],
  );

  const handleBarLeave = useCallback(() => setTooltip(null), []);

  const handleSegmentHover = useCallback(
    (
      _barIndex: number,
      name: string,
      amount: number,
      barLabel: string,
      startDate: Date,
      rect: DOMRect,
    ) => {
      const month = startDate.toLocaleDateString(undefined, {
        month: "short",
      });
      const displayName =
        activeTab === "by-category" ? formatCategory(name) : name;
      setTooltip({
        text: `${displayName} | ${formatAmount(currency, amount)} | ${barLabel} ${month}`,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    [activeTab, currency],
  );

  const handleSegmentLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleSegmentClick = useCallback(
    (barIndex: number, name: string) => {
      setClickedSegment((prev) =>
        prev?.barIndex === barIndex && prev?.name === name
          ? null
          : { barIndex, name },
      );
    },
    [],
  );

  const handleListHover = useCallback((name: string) => {
    setFocusedName(name);
  }, []);

  const handleListLeave = useCallback(() => {
    setFocusedName(null);
    setTooltip(null);
  }, []);

  if (!output) {
    return (
      <div className="txn-container">
        <div className="space-loading">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="txn-container">
      {/* Spending Header */}
      <div className="txn-spending-header">
        <span className="txn-spending-header__label">
          Spent {PERIOD_LABELS[activePeriodData.period].toLowerCase()}
        </span>
        <span className="txn-spending-header__amount">
          {formatAmount(currency, activePeriodData.spendingTotal)}
        </span>
      </div>

      {/* Chart Carousel */}
      <div className="txn-chart">
        <div className="txn-carousel">
          <button
            className="txn-carousel__chevron txn-carousel__chevron--left"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((i) => i - 1)}
          >
            &#8249;
          </button>
          <button
            className="txn-carousel__chevron txn-carousel__chevron--right"
            disabled={activeIndex === PERIODS.length - 1}
            onClick={() => setActiveIndex((i) => i + 1)}
          >
            &#8250;
          </button>
          <div
            className="txn-carousel__track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {allPeriodData.map((pd, i) => (
              <div
                key={`${pd.period}-${activeTab}`}
                className="txn-carousel__slide"
              >
                <div className="txn-carousel__label">
                  {PERIOD_LABELS[pd.period]}
                </div>
                {activeTab === "transactions" ? (
                  <BarChart
                    bars={pd.bars}
                    onBarHover={
                      i === activeIndex ? handleBarHover : () => {}
                    }
                    onBarLeave={
                      i === activeIndex ? handleBarLeave : () => {}
                    }
                  />
                ) : (
                  <StackedBarChart
                    bars={
                      activeTab === "by-category"
                        ? pd.categoryStackedBars
                        : pd.merchantStackedBars
                    }
                    focusedName={i === activeIndex ? focusedName : null}
                    onSegmentHover={
                      i === activeIndex ? handleSegmentHover : () => {}
                    }
                    onSegmentLeave={
                      i === activeIndex ? handleSegmentLeave : () => {}
                    }
                    onSegmentClick={
                      i === activeIndex ? handleSegmentClick : () => {}
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="txn-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="txn-tabs">
        {(["transactions", "by-category", "by-merchant"] as BottomTab[]).map(
          (tab) => (
            <button
              key={tab}
              className={`txn-tab${activeTab === tab ? " txn-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "transactions"
                ? "Transactions"
                : tab === "by-category"
                  ? "By Category"
                  : "By Merchant"}
            </button>
          ),
        )}
      </div>

      {/* Tab Content */}
      <div
        key={`${activeTab}-${activeIndex}`}
        style={{ animation: "txn-list-enter 0.25s ease both" }}
      >
        {activeTab === "transactions" &&
          (sortedItems.length === 0 ? (
            <div className="space-empty">
              No transactions for this period
            </div>
          ) : (
            <div className="txn-list">
              {sortedItems.map((item, i) => (
                <TransactionCard
                  key={item.feedItemUid || i}
                  item={item}
                  index={i}
                />
              ))}
            </div>
          ))}

        {activeTab === "by-category" &&
          (activePeriodData.categories.length === 0 ? (
            <div className="space-empty">No spending for this period</div>
          ) : (
            <div className="txn-list">
              {activePeriodData.categories.map((item, i) => (
                <AggregateCard
                  key={item.name}
                  item={item}
                  index={i}
                  isFocused={focusedName === item.name}
                  currency={currency}
                  showAvatar={false}
                  onHover={handleListHover}
                  onLeave={handleListLeave}
                />
              ))}
            </div>
          ))}

        {activeTab === "by-merchant" &&
          (activePeriodData.merchants.length === 0 ? (
            <div className="space-empty">No spending for this period</div>
          ) : (
            <div className="txn-list">
              {activePeriodData.merchants.map((item, i) => (
                <AggregateCard
                  key={item.name}
                  item={item}
                  index={i}
                  isFocused={focusedName === item.name}
                  currency={currency}
                  showAvatar={true}
                  onHover={handleListHover}
                  onLeave={handleListLeave}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

export default DisplayGetTransactions;
mountWidget(<DisplayGetTransactions />);
