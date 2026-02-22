import "@/index.css";
import { useState, useEffect } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

type Prefill = NonNullable<
  NonNullable<ReturnType<typeof useToolInfo<"display-create-space">>["output"]>["prefill"]
>;

function DisplayCreateSpace() {
  const { output } = useToolInfo<"display-create-space">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Create Space</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return <CreateSpaceForm prefill={output.prefill ?? {}} />;
}

function CreateSpaceForm({ prefill }: { prefill: Prefill }) {
  const sendFollowUp = useSendFollowUpMessage();

  // Account selection state
  const { callToolAsync } = useCallTool("get-accounts");
  const [accounts, setAccounts] = useState<
    Array<{
      accountUid: string;
      name: string;
      currency: string;
      accountType: string;
      balance?: {
        effectiveBalance?: { currency: string; minorUnits: number };
      };
    }>
  >([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<
    (typeof accounts)[number] | null
  >(null);

  // Form fields
  const [name, setName] = useState(prefill.name ?? "");
  const [currency, setCurrency] = useState(prefill.currency ?? "");
  const [hasTarget, setHasTarget] = useState(
    prefill.targetMinorUnits != null && prefill.targetMinorUnits > 0
  );
  const [targetAmount, setTargetAmount] = useState(
    prefill.targetMinorUnits != null ? prefill.targetMinorUnits / 100 : 0
  );

  // Photo upload state
  const [photoBase64, setPhotoBase64] = useState<string | null>(
    prefill.base64EncodedPhoto ?? null
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    prefill.base64EncodedPhoto
      ? `data:image/png;base64,${prefill.base64EncodedPhoto}`
      : null
  );

  // Create space tool
  const {
    callTool: callCreate,
    isPending: isCreating,
    isSuccess: createSuccess,
  } = useCallTool("create-space");

  // Fetch accounts on mount
  useEffect(() => {
    callToolAsync()
      .then((res) => {
        const sc = res.structuredContent as
          | { accounts?: typeof accounts }
          | undefined;
        setAccounts(sc?.accounts ?? []);
        setLoadingAccounts(false);
      })
      .catch(() => {
        setLoadingAccounts(false);
      });
  }, []);

  // When an account is selected, default the currency if not already set
  const handleSelectAccount = (account: (typeof accounts)[number]) => {
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
      // Strip the data:image/...;base64, prefix
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

  const formatBalance = (minorUnits: number, curr: string) => {
    const major = minorUnits / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: curr,
      }).format(major);
    } catch {
      return `${curr} ${major.toFixed(2)}`;
    }
  };

  // Step 1: Account Selector
  if (!selectedAccount) {
    return (
      <div className="payees-container">
        <div className="space-form">
          <h2 className="space-form__title">Select Account</h2>

          {loadingAccounts ? (
            <span className="payee-spinner" />
          ) : accounts.length === 0 ? (
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
                    {account.balance?.effectiveBalance
                      ? formatBalance(
                          account.balance.effectiveBalance.minorUnits,
                          account.balance.effectiveBalance.currency
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
                  style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
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

  // Step 2: Space Creation Form
  return (
    <div className="payees-container">
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
                document.getElementById("space-photo-input")?.click()
              }
            >
              Click to upload a photo
            </div>
          )}
          <input
            id="space-photo-input"
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
    </div>
  );
}

export default DisplayCreateSpace;
mountWidget(<DisplayCreateSpace />);
