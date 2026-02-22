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

function AccountSelector({
  accounts,
  onSelect,
}: {
  accounts: Account[];
  onSelect: (account: Account) => void;
}) {
  return (
    <div className="space-form">
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
            onClick={() => onSelect(account)}
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

function SpaceSelector({
  account,
  onSelect,
  onBack,
}: {
  account: Account;
  onSelect: (space: Space) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-form">
      <button className="payee-form__back" onClick={onBack} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h2 className="space-form__title">Select Space</h2>

      {account.spaces.length === 0 ? (
        <div style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "1rem" }}>
          No spaces found for this account
        </div>
      ) : (
        account.spaces.map((space) => (
          <div
            className="space-list-item"
            key={space.savingsGoalUid}
            onClick={() => onSelect(space)}
          >
            <SpaceListPhoto
              name={space.name}
              accountUid={account.accountUid}
              savingsGoalUid={space.savingsGoalUid}
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
        ))
      )}
    </div>
  );
}

function UpdateSpaceForm({
  accountUid,
  space,
  existingPhotoDataUrl,
  overrides,
  onBack,
}: {
  accountUid: string;
  space: Space;
  existingPhotoDataUrl: string | null;
  overrides: Record<string, unknown>;
  onBack: () => void;
}) {
  const sendFollowUp = useSendFollowUpMessage();

  const [name, setName] = useState(
    (overrides.name as string) ?? space.name
  );
  const [currency, setCurrency] = useState(
    (overrides.currency as string) ?? space.totalSaved.currency
  );

  const existingTarget = space.target && space.target.minorUnits > 0;
  const overrideTarget = overrides.targetMinorUnits != null;
  const [hasTarget, setHasTarget] = useState(
    overrideTarget || !!existingTarget
  );
  const [targetAmount, setTargetAmount] = useState(
    overrideTarget
      ? (overrides.targetMinorUnits as number) / 100
      : existingTarget
        ? space.target!.minorUnits / 100
        : 0
  );

  // Derive raw base64 from existing data URL
  const existingBase64 = existingPhotoDataUrl
    ? existingPhotoDataUrl.replace(/^data:image\/[^;]+;base64,/, "")
    : null;

  const [photoBase64, setPhotoBase64] = useState<string | null>(
    (overrides.base64EncodedPhoto as string) ?? existingBase64
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    overrides.base64EncodedPhoto
      ? `data:image/png;base64,${overrides.base64EncodedPhoto}`
      : existingPhotoDataUrl
  );

  const {
    callTool: callUpdate,
    isPending: isUpdating,
    isSuccess: updateSuccess,
  } = useCallTool("update-space");

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
    const params: Record<string, unknown> = {
      accountUid,
      spaceUid: space.savingsGoalUid,
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
    callUpdate(params as Parameters<typeof callUpdate>[0], {
      onSuccess: () => {
        sendFollowUp(
          `[Update Space Form] The user updated the space "${name}" successfully.`
        );
      },
    });
  };

  return (
    <div className="space-form">
      <button
        className="payee-form__back"
        onClick={onBack}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h2 className="space-form__title">Update Space</h2>

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
              document.getElementById("update-space-photo-input")?.click()
            }
          >
            Click to upload a photo
          </div>
        )}
        <input
          id="update-space-photo-input"
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          style={{ display: "none" }}
        />
      </div>

      <button
        className={`space-form__submit${updateSuccess ? " space-form__submit--success" : ""}`}
        onClick={handleSubmit}
        disabled={isUpdating || !name || !currency}
      >
        {isUpdating && <span className="payee-spinner" />}
        {updateSuccess ? "Space Updated" : "Update Space"}
      </button>
    </div>
  );
}

function UpdateSpaceInner({
  accounts,
  selectedAccountUid,
  selectedSpaceUid,
  overrides,
}: {
  accounts: Account[];
  selectedAccountUid: string | null;
  selectedSpaceUid: string | null;
  overrides: Record<string, unknown>;
}) {
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

  if (!selectedAccount) {
    return (
      <AccountSelector
        accounts={accounts}
        onSelect={(a) => setSelectedAccount(a)}
      />
    );
  }

  if (!selectedSpace) {
    return (
      <SpaceSelector
        account={selectedAccount}
        onSelect={(s) => setSelectedSpace(s)}
        onBack={() => setSelectedAccount(null)}
      />
    );
  }

  return (
    <UpdateSpaceForm
      accountUid={selectedAccount.accountUid}
      space={selectedSpace}
      existingPhotoDataUrl={null}
      overrides={overrides}
      onBack={() => setSelectedSpace(null)}
    />
  );
}

function DisplayUpdateSpace() {
  const { output } = useToolInfo<"display-update-space">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Update Space</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="payees-container">
      <UpdateSpaceInner
        accounts={output.accounts ?? []}
        selectedAccountUid={output.selectedAccountUid ?? null}
        selectedSpaceUid={output.selectedSpaceUid ?? null}
        overrides={output.overrides ?? {}}
      />
    </div>
  );
}

export default DisplayUpdateSpace;
mountWidget(<DisplayUpdateSpace />);
