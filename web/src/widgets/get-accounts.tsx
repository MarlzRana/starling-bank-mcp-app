import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

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
  const { output } = useToolInfo<"get-accounts">();

  if (!output) {
    return (
      <div className="accounts-container">
        <div className="accounts-loading">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="accounts-container">
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
