import "@/index.css";

import { useState, useRef } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

interface MinorUnitsAmount {
  currency: string;
  minorUnits: number;
}

interface AccountIdentifier {
  identifierType: "SORT_CODE" | "IBAN_BIC" | "ABA_ACH";
  bankIdentifier: string;
  accountIdentifier: string;
}

interface Account {
  accountUid: string;
  name: string;
  accountType: string;
  currency: string;
  createdAt: string;
  balance: {
    clearedBalance: MinorUnitsAmount;
    effectiveBalance: MinorUnitsAmount;
    pendingTransactions: MinorUnitsAmount;
  };
  identifiers: AccountIdentifier[];
}

function formatAmount(currency: string, minorUnits: number): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(major);
}

function ProfileImage({
  imageUrl,
  accountHolderUid,
}: {
  imageUrl: string | null;
  accountHolderUid: string;
}) {
  const [localImage, setLocalImage] = useState<string | null>(imageUrl);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { callTool: callUpdate, isPending: isUpdating } = useCallTool("update-profile-image");
  const { callTool: callDelete, isPending: isDeleting } = useCallTool("delete-profile-image");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const contentType = header.match(/data:(.*?);/)?.[1] ?? "image/png";

      setUploadState("uploading");
      callUpdate(
        { accountHolderUid, imageBase64: base64, contentType },
        {
          onSuccess: () => {
            setLocalImage(dataUrl);
            setUploadState("success");
            setTimeout(() => setUploadState("idle"), 1500);
          },
          onError: () => {
            setUploadState("idle");
          },
        },
      );
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleDelete = () => {
    callDelete(
      { accountHolderUid },
      {
        onSuccess: () => {
          setLocalImage(null);
          setShowDeleteConfirm(false);
        },
        onError: () => {
          setShowDeleteConfirm(false);
        },
      },
    );
  };

  return (
    <div className="profile-image-section">
      <div className="profile-image-wrapper" onClick={() => fileInputRef.current?.click()}>
        {localImage ? (
          <img src={localImage} className="profile-image" alt="Profile" />
        ) : (
          <div className="profile-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        <div className="profile-image-overlay">
          {uploadState === "uploading" || isUpdating ? (
            <span className="profile-image-spinner" />
          ) : uploadState === "success" ? (
            <svg className="profile-image-check" viewBox="0 0 52 52" width="28" height="28">
              <circle className="transfer-checkmark__circle" cx="26" cy="26" r="25" fill="none" stroke="#fff" strokeWidth="2" />
              <path className="transfer-checkmark__check" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
      </div>

      {localImage && (
        <button
          className="profile-image-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          title="Remove photo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {showDeleteConfirm && (
        <div className="profile-delete-overlay">
          <div className="profile-delete-dialog">
            <div className="payee-delete-dialog__title">
              Remove profile photo?
            </div>
            <div className="payee-delete-dialog__info">
              This will delete your profile image from your Starling account.
            </div>
            <div className="payee-delete-dialog__actions">
              <button
                className="payee-delete-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="payee-delete-confirm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && <span className="payee-spinner" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IdentifierRow({ identifier }: { identifier: AccountIdentifier }) {
  if (identifier.identifierType === "SORT_CODE") {
    return (
      <div className="identifier-row">
        <span className="identifier-label">Sort Code</span>
        <span className="identifier-value">{identifier.bankIdentifier}</span>
        <span className="identifier-label">Account No.</span>
        <span className="identifier-value">{identifier.accountIdentifier}</span>
      </div>
    );
  }
  if (identifier.identifierType === "IBAN_BIC") {
    return (
      <div className="identifier-row">
        <span className="identifier-label">IBAN</span>
        <span className="identifier-value">{identifier.accountIdentifier}</span>
        <span className="identifier-label">BIC</span>
        <span className="identifier-value">{identifier.bankIdentifier}</span>
      </div>
    );
  }
  if (identifier.identifierType === "ABA_ACH") {
    return (
      <div className="identifier-row">
        <span className="identifier-label">ABA</span>
        <span className="identifier-value">{identifier.bankIdentifier}</span>
        <span className="identifier-label">ACH</span>
        <span className="identifier-value">{identifier.accountIdentifier}</span>
      </div>
    );
  }
  return null;
}

function AccountCard({ account }: { account: Account }) {
  const effective = account.balance.effectiveBalance;
  const cleared = account.balance.clearedBalance;
  const pending = account.balance.pendingTransactions;

  return (
    <div className="account-card">
      <div className="account-header">
        <span className="account-name">{account.name}</span>
        <span className="account-type-badge">{account.accountType.replace(/_/g, " ")}</span>
        <span className="account-currency">{account.currency}</span>
      </div>

      <div className="balance-section">
        <div className="balance-amount">{formatAmount(effective.currency, effective.minorUnits)}</div>
        <div className="balance-label">Effective Balance</div>
        <div className="balance-secondary">
          <span>
            <span className="balance-label">Cleared: </span>
            {formatAmount(cleared.currency, cleared.minorUnits)}
          </span>
          {pending.minorUnits !== 0 && (
            <span>
              <span className="balance-label"> Pending: </span>
              {formatAmount(pending.currency, pending.minorUnits)}
            </span>
          )}
        </div>
      </div>

      {account.identifiers.length > 0 && (
        <div className="identifiers-section">
          {account.identifiers.map((id, i) => (
            <IdentifierRow key={i} identifier={id} />
          ))}
        </div>
      )}
    </div>
  );
}

function GetAccounts() {
  const { output, responseMetadata } = useToolInfo<"get-accounts">();
  const profileImageUrl = (responseMetadata?.profileImageUrl as string | null) ?? null;

  if (!output) {
    return (
      <div className="accounts-container">
        <div className="accounts-loading">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="accounts-container">
      {output.accountHolderUid && (
        <ProfileImage
          imageUrl={profileImageUrl}
          accountHolderUid={output.accountHolderUid}
        />
      )}
      {output.accountHolderName && (
        <div className="account-holder-name">{output.accountHolderName}</div>
      )}
      {output.accounts.map((account: Account) => (
        <AccountCard key={account.accountUid} account={account} />
      ))}
    </div>
  );
}

export default GetAccounts;

mountWidget(<GetAccounts />);
