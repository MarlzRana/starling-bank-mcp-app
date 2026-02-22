import '@/index.css';

import { useEffect, useState } from 'react';
import { mountWidget } from 'skybridge/web';
import { useToolInfo, useCallTool } from '../helpers.js';
import chipIcon from '../assets/chip.svg';
import chipIconDisabled from '../assets/chip_disabled.svg';
import contactlessIcon from '../assets/contactless_icon.svg';
import contactlessIconDisabled from '../assets/contactless_icon_disabled.svg';
import padlockIcon from '../assets/padlock_closed.svg';

type ControlKey =
  | 'atm-enabled'
  | 'enabled'
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

function CardVisual({
  card,
  enabled,
  posEnabled,
}: {
  card: Card;
  enabled: boolean;
  posEnabled: boolean;
}) {
  const lastDigits = card.endOfCardNumber?.slice(-4) ?? '????';

  return (
    <div className="starling-card">
      <div className="starling-card__top">
        <span className="starling-card__bank-name">STARLING</span>
      </div>

      <div className="starling-card__middle">
        {/* EMV Chip */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <img
            className="starling-card__chip"
            src={enabled && posEnabled ? chipIcon : chipIconDisabled}
            alt="EMV Chip"
          />
          {(!enabled || !posEnabled) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '62%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(var(--color-text-rgb), 0.7)',
                  backgroundColor: 'rgba(var(--color-text-rgb), 0.5)',
                }}
              >
                <img
                  src={padlockIcon}
                  alt="Locked"
                  style={{ width: '55%', height: '55%' }}
                />
              </span>
            </div>
          )}
        </div>

        {/* Contactless */}
        <img
          className="starling-card__contactless"
          src={posEnabled ? contactlessIcon : contactlessIconDisabled}
          alt={posEnabled ? 'Contactless' : 'Contactless disabled'}
        />
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
            <circle
              cx="16"
              cy="15"
              r="14"
              style={{ fill: 'var(--color-mc-red)' }}
            />
            <circle
              cx="30"
              cy="15"
              r="14"
              style={{ fill: 'var(--color-mc-yellow)' }}
            />
            <path
              d="M23 3.6a14 14 0 0 1 0 22.8A14 14 0 0 1 23 3.6z"
              style={{ fill: 'var(--color-mc-orange)' }}
            />
          </svg>
        </div>
      </div>

      {!enabled && (
        <div className="starling-card__locked-banner">
          <span className="starling-card__locked-circle">
            <img
              src={padlockIcon}
              alt="Locked"
              className="starling-card__locked-icon"
            />
          </span>
        </div>
      )}
    </div>
  );
}

// ── Card Back Visual ─────────────────────────────────────────────────────────

function CardBack({ card }: { card: Card }) {
  const lastDigits = card.endOfCardNumber?.slice(-4) ?? '????';
  const { callToolAsync } = useCallTool('get-accounts');
  const [holderName, setHolderName] = useState('••••••••••');
  const [accountNumber, setAccountNumber] = useState('••••••••');
  const [sortCode, setSortCode] = useState('••-••-••');

  useEffect(() => {
    callToolAsync().then((res) => {
      const data = res.structuredContent as {
        accountHolderName?: string;
        accounts?: Array<{
          identifiers?: Array<{
            identifierType: string;
            bankIdentifier: string;
            accountIdentifier: string;
          }>;
        }>;
      };
      if (data.accountHolderName) {
        setHolderName(data.accountHolderName);
      }
      const account = data.accounts?.[0];
      if (account) {
        const sortCodeId = account.identifiers?.find(
          (id) => id.identifierType === 'SORT_CODE',
        );
        if (sortCodeId) {
          setAccountNumber(sortCodeId.accountIdentifier);
          setSortCode(sortCodeId.bankIdentifier);
        }
      }
    });
  }, []);

  return (
    <div className="starling-card-back">
      {/* Magnetic stripe */}
      <div className="starling-card-back__stripe" />

      {/* Signature strip + CVV */}
      <div className="starling-card-back__signature">
        <div className="starling-card-back__sig-strip" />
        <div className="starling-card-back__cvv">
          <span className="starling-card-back__cvv-label">CVV</span>
          <span className="starling-card-back__cvv-value">•••</span>
        </div>
      </div>

      {/* Card details */}
      <div className="starling-card-back__details">
        <div className="starling-card-back__number">
          •••• •••• •••• {lastDigits}
        </div>
        <div className="starling-card-back__name">
          {holderName.toUpperCase()}
        </div>
        <div className="starling-card-back__row">
          <span className="starling-card-back__expiry">EXP END ••/••</span>
          <span className="starling-card-back__account">
            {sortCode} / {accountNumber}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="starling-card-back__footer">
        <span className="starling-card-back__debit-badge">debit</span>
        <span className="starling-card-back__service">
          Starling Bank &bull; starlingbank.com
        </span>
      </div>
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
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
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
    <div className="card-controls card-controls--overlay">
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

  // Optimistic overrides for control toggles: { [cardUid]: { [control]: boolean } }
  const [overrides, setOverrides] = useState<
    Record<string, Partial<Record<ControlKey, boolean>>>
  >({});

  // Confirmed control values for the card visual — only updated after API succeeds
  const [confirmedControls, setConfirmedControls] = useState<
    Record<string, Partial<Record<ControlKey, boolean>>>
  >({});

  // Which card is flipped to show the back (null = none)
  const [flippedCardUid, setFlippedCardUid] = useState<string | null>(null);

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
    callTool(
      { cardUid, control, value },
      {
        onSuccess: () => {
          setConfirmedControls((prev) => ({
            ...prev,
            [cardUid]: { ...(prev[cardUid] ?? {}), [control]: value },
          }));
        },
        onError: () => {
          // Revert the optimistic override so the toggle reflects true state
          setOverrides((prev) => ({
            ...prev,
            [cardUid]: { ...(prev[cardUid] ?? {}), [control]: !value },
          }));
        },
      },
    );
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
      {cards.map((card) => {
        const isFlipped = flippedCardUid === card.cardUid;
        const confirmed = confirmedControls[card.cardUid] ?? {};
        const cardEnabled =
          'enabled' in confirmed ? confirmed['enabled']! : card.enabled;
        const cardPosEnabled =
          'pos-enabled' in confirmed
            ? confirmed['pos-enabled']!
            : card.posEnabled;

        return (
          <div key={card.cardUid} className="card-section">
            <div
              className="card-flip-container"
              onClick={() => setFlippedCardUid(isFlipped ? null : card.cardUid)}
            >
              <div
                className={`card-flip ${isFlipped ? 'card-flip--flipped' : ''}`}
              >
                {/* Front face */}
                <div className="card-flip__face card-flip__front">
                  <CardVisual
                    card={card}
                    enabled={cardEnabled}
                    posEnabled={cardPosEnabled}
                  />
                </div>

                {/* Back face */}
                <div className="card-flip__face card-flip__back">
                  <CardBack card={card} />
                  <div className="card-back__controls-overlay">
                    <ControlsPanel
                      card={card}
                      overrides={overrides[card.cardUid] ?? {}}
                      onToggle={(control, value) =>
                        handleToggle(card.cardUid, control, value)
                      }
                      isPending={isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="card-hint">
              See and adjust card controls by clicking/tapping the card
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default GetCards;

mountWidget(<GetCards />);
