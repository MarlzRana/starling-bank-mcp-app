import "@/index.css";
import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

interface AccountFormData {
  description: string;
  countryCode: string;
  accountIdentifier: string;
  bankIdentifier: string;
  bankIdentifierType: string;
  defaultAccount: boolean;
}

const emptyAccount = (): AccountFormData => ({
  description: "",
  countryCode: "GB",
  accountIdentifier: "",
  bankIdentifier: "",
  bankIdentifierType: "SORT_CODE",
  defaultAccount: false,
});

function AccountFormEntry({
  account,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  account: AccountFormData;
  index: number;
  onChange: (index: number, data: AccountFormData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const update = (field: keyof AccountFormData, value: string | boolean) => {
    onChange(index, { ...account, [field]: value });
  };

  return (
    <div className="payee-accounts-form__entry">
      <button
        className="payee-accounts-form__remove"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        title="Remove account"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="payee-form__group">
        <label className="payee-form__label">Description</label>
        <input
          className="payee-form__input"
          value={account.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
      <div className="payee-accounts-form__row">
        <div className="payee-form__group">
          <label className="payee-form__label">Country Code</label>
          <input
            className="payee-form__input"
            value={account.countryCode}
            onChange={(e) => update("countryCode", e.target.value)}
          />
        </div>
        <div className="payee-form__group">
          <label className="payee-form__label">Bank ID Type</label>
          <select
            className="payee-form__select"
            value={account.bankIdentifierType}
            onChange={(e) => update("bankIdentifierType", e.target.value)}
          >
            <option value="SORT_CODE">SORT_CODE</option>
            <option value="SWIFT">SWIFT</option>
            <option value="IBAN">IBAN</option>
            <option value="ABA">ABA</option>
            <option value="ABA_WIRE">ABA_WIRE</option>
            <option value="ABA_ACH">ABA_ACH</option>
          </select>
        </div>
      </div>
      <div className="payee-accounts-form__row">
        <div className="payee-form__group">
          <label className="payee-form__label">Account Identifier</label>
          <input
            className="payee-form__input"
            value={account.accountIdentifier}
            onChange={(e) => update("accountIdentifier", e.target.value)}
          />
        </div>
        <div className="payee-form__group">
          <label className="payee-form__label">Bank Identifier</label>
          <input
            className="payee-form__input"
            value={account.bankIdentifier}
            onChange={(e) => update("bankIdentifier", e.target.value)}
          />
        </div>
      </div>
      <label className="payee-accounts-form__checkbox">
        <input
          type="checkbox"
          checked={account.defaultAccount}
          onChange={(e) => update("defaultAccount", e.target.checked)}
        />
        Default account
      </label>
    </div>
  );
}

type Prefill = NonNullable<NonNullable<ReturnType<typeof useToolInfo<"display-create-payee">>["output"]>["prefill"]>;

function DisplayCreatePayee() {
  const { output } = useToolInfo<"display-create-payee">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="payee-form">
          <h2 className="payee-form__title">Create Payee</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return <CreatePayeeForm prefill={output.prefill ?? {}} />;
}

function CreatePayeeForm({ prefill }: { prefill: Prefill }) {
  const sendFollowUp = useSendFollowUpMessage();

  const [payeeName, setPayeeName] = useState(prefill.payeeName ?? "");
  const [payeeType, setPayeeType] = useState<"INDIVIDUAL" | "BUSINESS">(
    prefill.payeeType ?? "INDIVIDUAL"
  );
  const [firstName, setFirstName] = useState(prefill.firstName ?? "");
  const [middleName, setMiddleName] = useState(prefill.middleName ?? "");
  const [lastName, setLastName] = useState(prefill.lastName ?? "");
  const [businessName, setBusinessName] = useState(prefill.businessName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(prefill.phoneNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(prefill.dateOfBirth ?? "");
  const [accounts, setAccounts] = useState<AccountFormData[]>(
    prefill.accounts?.length
      ? prefill.accounts.map((a) => ({
          description: a.description ?? "",
          countryCode: a.countryCode ?? "GB",
          accountIdentifier: a.accountIdentifier ?? "",
          bankIdentifier: a.bankIdentifier ?? "",
          bankIdentifierType: a.bankIdentifierType ?? "SORT_CODE",
          defaultAccount: a.defaultAccount ?? false,
        }))
      : [emptyAccount()]
  );

  const {
    callTool: callCreate,
    isPending: isCreating,
    isSuccess: createSuccess,
  } = useCallTool("create-payee");

  const handleAccountChange = (index: number, data: AccountFormData) => {
    setAccounts((prev) => prev.map((a, i) => (i === index ? data : a)));
  };

  const handleAccountRemove = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const base: Record<string, unknown> = { payeeName, payeeType };
    if (payeeType === "INDIVIDUAL") {
      if (firstName) base.firstName = firstName;
      if (middleName) base.middleName = middleName;
      if (lastName) base.lastName = lastName;
    } else {
      if (businessName) base.businessName = businessName;
    }
    if (phoneNumber) base.phoneNumber = phoneNumber;
    if (dateOfBirth) base.dateOfBirth = dateOfBirth;

    base.accounts = accounts.map((a) => ({
      description: a.description,
      countryCode: a.countryCode,
      accountIdentifier: a.accountIdentifier,
      bankIdentifier: a.bankIdentifier,
      bankIdentifierType: a.bankIdentifierType,
      defaultAccount: a.defaultAccount,
    }));

    callCreate(base as Parameters<typeof callCreate>[0], {
      onSuccess: () => {
        sendFollowUp(
          `[Create Payee Form] The user submitted the create payee form and 2FA confirmation was requested on their device for payee "${payeeName}".`
        );
      },
    });
  };

  return (
    <div className="payees-container">
      <div className="payee-form">
        <h2 className="payee-form__title">Create Payee</h2>

        <div className="payee-form__group">
          <label className="payee-form__label">Payee Name</label>
          <input
            className="payee-form__input"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            required
          />
        </div>

        <div className="payee-form__group">
          <label className="payee-form__label">Type</label>
          <div className="payee-form__segmented">
            <button
              className={`payee-form__segment${payeeType === "INDIVIDUAL" ? " payee-form__segment--active" : ""}`}
              onClick={() => setPayeeType("INDIVIDUAL")}
              type="button"
            >
              Individual
            </button>
            <button
              className={`payee-form__segment${payeeType === "BUSINESS" ? " payee-form__segment--active" : ""}`}
              onClick={() => setPayeeType("BUSINESS")}
              type="button"
            >
              Business
            </button>
          </div>
        </div>

        {payeeType === "INDIVIDUAL" ? (
          <>
            <div className="payee-form__group">
              <label className="payee-form__label">First Name</label>
              <input
                className="payee-form__input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="payee-form__group">
              <label className="payee-form__label">Middle Name</label>
              <input
                className="payee-form__input"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div className="payee-form__group">
              <label className="payee-form__label">Last Name</label>
              <input
                className="payee-form__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="payee-form__group">
            <label className="payee-form__label">Business Name</label>
            <input
              className="payee-form__input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
        )}

        <div className="payee-form__group">
          <label className="payee-form__label">Phone Number</label>
          <input
            className="payee-form__input"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <div className="payee-form__group">
          <label className="payee-form__label">Date of Birth</label>
          <input
            className="payee-form__input"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        <div className="payee-accounts-form">
          <span className="payee-accounts-form__title">Accounts</span>
          {accounts.map((account, i) => (
            <AccountFormEntry
              key={i}
              account={account}
              index={i}
              onChange={handleAccountChange}
              onRemove={handleAccountRemove}
              canRemove={accounts.length > 1}
            />
          ))}
          <button
            className="payee-accounts-form__add"
            type="button"
            onClick={() => setAccounts((prev) => [...prev, emptyAccount()])}
          >
            + Add Account
          </button>
        </div>

        <button
          className={`payee-form__submit${createSuccess ? " payee-form__submit--success" : ""}`}
          onClick={handleSubmit}
          disabled={isCreating || !payeeName}
        >
          {isCreating && <span className="payee-spinner" />}
          {createSuccess
            ? "Requested you for confirmation on your device"
            : "Create Payee"}
        </button>
      </div>
    </div>
  );
}

export default DisplayCreatePayee;
mountWidget(<DisplayCreatePayee />);
