import '@/index.css';

import { useState } from 'react';
import { mountWidget } from 'skybridge/web';
import { useToolInfo, useCallTool } from '../helpers.js';

type ControlKey =
  | 'atm-enabled'
  | 'enabled'
  | 'gambling-enabled'
  | 'mag-stripe-enabled'
  | 'mobile-wallet-enabled'
  | 'online-enabled'
  | 'pos-enabled';

interface CurrencyFlag {
  currency: string;
  enabled: boolean;
}

interface Card {
  cardUid: string;
  publicToken: string;
  enabled: boolean;
  walletNotificationEnabled: boolean;
  posEnabled: boolean;
  atmEnabled: boolean;
  onlineEnabled: boolean;
  mobileWalletEnabled: boolean;
  gamblingEnabled: boolean;
  magStripeEnabled: boolean;
  cancelled: boolean;
  activationRequested: boolean;
  activated: boolean;
  endOfCardNumber: string;
  currencyFlags: CurrencyFlag[];
  cardAssociationUid: string;
}

// ── Card Visual ──────────────────────────────────────────────────────────────

function CardVisual({ card }: { card: Card }) {
  const lastDigits = card.endOfCardNumber?.slice(-4) ?? '????';

  return (
    <div className="starling-card">
      <div className="starling-card__top">
        <span className="starling-card__bank-name">STARLING</span>
      </div>

      <div className="starling-card__middle">
        {/* EMV Chip */}
        <svg
          className="starling-card__chip"
          viewBox="0 0 38 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1"
            y="1"
            width="36"
            height="26"
            rx="4"
            fill="#D4A55A"
            stroke="#A07830"
            strokeWidth="1"
          />
          <rect
            x="9"
            y="1"
            width="1.5"
            height="26"
            fill="#A07830"
            opacity="0.55"
          />
          <rect
            x="27.5"
            y="1"
            width="1.5"
            height="26"
            fill="#A07830"
            opacity="0.55"
          />
          <rect
            x="1"
            y="9.5"
            width="36"
            height="1.5"
            fill="#A07830"
            opacity="0.55"
          />
          <rect
            x="1"
            y="17"
            width="36"
            height="1.5"
            fill="#A07830"
            opacity="0.55"
          />
          <rect
            x="13"
            y="5"
            width="12"
            height="18"
            rx="2"
            fill="#C49040"
            stroke="#A07830"
            strokeWidth="0.5"
          />
          <rect
            x="15"
            y="9"
            width="8"
            height="10"
            rx="1"
            fill="#B8893E"
            opacity="0.7"
          />
        </svg>

        {/* Contactless */}
        <svg
          className="starling-card__contactless"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 14 Q14 10 18 14"
            stroke="#141413"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.45"
          />
          <path
            d="M6.5 14 Q14 5.5 21.5 14"
            stroke="#141413"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
          <path
            d="M3 14 Q14 1 25 14"
            stroke="#141413"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <circle cx="14" cy="14" r="1.8" fill="#141413" opacity="0.85" />
        </svg>
      </div>

      <div className="starling-card__bottom">
        <div className="starling-card__number">•••• {lastDigits}</div>
        <div className="starling-card__brand">
          <span className="starling-card__brand-label">
            world
            <br />
            debit
          </span>
          {/* Mastercard logo */}
          <svg
            className="starling-card__mastercard"
            viewBox="0 0 46 30"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="16" cy="15" r="14" fill="#EB001B" />
            <circle cx="30" cy="15" r="14" fill="#F79E1B" />
            <path
              d="M23 3.6a14 14 0 0 1 0 22.8A14 14 0 0 1 23 3.6z"
              fill="#FF5F00"
            />
          </svg>
        </div>
      </div>

      {!card.enabled && (
        <div className="starling-card__locked-banner">LOCKED</div>
      )}
    </div>
  );
}

// ── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`card-toggle ${disabled ? 'card-toggle--disabled' : ''}`}>
      <span className="card-toggle__label">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`card-toggle__switch ${checked ? 'card-toggle__switch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="card-toggle__thumb" />
      </button>
    </div>
  );
}

// ── Controls Panel ───────────────────────────────────────────────────────────

const CONTROLS: { key: ControlKey; label: string; cardProp: keyof Card }[] = [
  { key: 'enabled', label: 'Card Active', cardProp: 'enabled' },
  { key: 'atm-enabled', label: 'ATM Withdrawals', cardProp: 'atmEnabled' },
  {
    key: 'pos-enabled',
    label: 'Contactless & Chip+PIN',
    cardProp: 'posEnabled',
  },
  {
    key: 'online-enabled',
    label: 'Online Payments',
    cardProp: 'onlineEnabled',
  },
  {
    key: 'mobile-wallet-enabled',
    label: 'Mobile Wallet',
    cardProp: 'mobileWalletEnabled',
  },
  { key: 'gambling-enabled', label: 'Gambling', cardProp: 'gamblingEnabled' },
  {
    key: 'mag-stripe-enabled',
    label: 'Mag Stripe',
    cardProp: 'magStripeEnabled',
  },
];

function ControlsPanel({
  card,
  overrides,
  onToggle,
  isPending,
}: {
  card: Card;
  overrides: Partial<Record<ControlKey, boolean>>;
  onToggle: (control: ControlKey, value: boolean) => void;
  isPending: boolean;
}) {
  return (
    <div className="card-controls">
      {CONTROLS.map(({ key, label, cardProp }) => {
        const value =
          key in overrides
            ? (overrides[key] as boolean)
            : (card[cardProp] as boolean);
        return (
          <Toggle
            key={key}
            label={label}
            checked={value}
            onChange={(v) => onToggle(key, v)}
            disabled={isPending}
          />
        );
      })}
    </div>
  );
}

// ── Root Widget ──────────────────────────────────────────────────────────────

function GetCards() {
  const { output } = useToolInfo<'get-cards'>();
  const { callTool, isPending } = useCallTool('update-card-control');

  // Optimistic overrides: { [cardUid]: { [control]: boolean } }
  const [overrides, setOverrides] = useState<
    Record<string, Partial<Record<ControlKey, boolean>>>
  >({});

  if (!output) {
    return (
      <div className="cards-page">
        <div className="cards-loading">Loading cards…</div>
      </div>
    );
  }

  const cards: Card[] = output.cards;

  function handleToggle(cardUid: string, control: ControlKey, value: boolean) {
    setOverrides((prev) => ({
      ...prev,
      [cardUid]: { ...(prev[cardUid] ?? {}), [control]: value },
    }));
    callTool({ cardUid, control, value });
  }

  const llmSummary = cards
    .map((c) => {
      const cardOverrides = overrides[c.cardUid] ?? {};
      const enabled =
        'enabled' in cardOverrides ? cardOverrides['enabled'] : c.enabled;
      return `Card ****${c.endOfCardNumber?.slice(-4)}: ${enabled ? 'active' : 'locked'}`;
    })
    .join('; ');

  return (
    <div className="cards-page" data-llm={llmSummary}>
      {cards.map((card) => (
        <div key={card.cardUid} className="card-section">
          <CardVisual card={card} />
          <ControlsPanel
            card={card}
            overrides={overrides[card.cardUid] ?? {}}
            onToggle={(control, value) =>
              handleToggle(card.cardUid, control, value)
            }
            isPending={isPending}
          />
        </div>
      ))}
    </div>
  );
}

export default GetCards;

mountWidget(<GetCards />);
