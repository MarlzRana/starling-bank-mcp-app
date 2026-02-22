import "@/index.css";
import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { useSendFollowUpMessage } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers.js";

interface PayeeAccount {
  payeeAccountUid: string;
  description: string;
  defaultAccount: boolean;
  countryCode: string;
  accountIdentifier: string;
  bankIdentifier: string;
  bankIdentifierType: string;
}

interface Payee {
  payeeUid: string;
  payeeName: string;
  payeeType: "BUSINESS" | "INDIVIDUAL";
  phoneNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: string;
  accounts: PayeeAccount[];
}

function PayeeSelector({
  payees,
  onSelect,
}: {
  payees: Payee[];
  onSelect: (payee: Payee) => void;
}) {
  return (
    <>
      <div className="payees-header">
        <span className="payees-header__title">Select a Payee to Update</span>
      </div>
      {payees.length === 0 ? (
        <div className="payees-empty">
          <span className="payees-empty__text">No payees found</span>
        </div>
      ) : (
        payees.map((payee) => {
          const singleAccount =
            payee.accounts.length === 1 ? payee.accounts[0] : null;
          return (
            <div
              key={payee.payeeUid}
              className="payee-card payee-card--clickable"
              onClick={() => onSelect(payee)}
            >
              <div className="payee-card__row">
                <div className="payee-avatar-initials">
                  {payee.payeeName[0]}
                </div>
                <div className="payee-card__info">
                  <span className="payee-card__name">{payee.payeeName}</span>
                  <span className="payee-card__type-badge">
                    {payee.payeeType}
                  </span>
                  {singleAccount && (
                    <span className="payee-card__account-inline">
                      {singleAccount.bankIdentifier} /{" "}
                      {singleAccount.accountIdentifier}
                    </span>
                  )}
                  {payee.accounts.length > 1 && (
                    <span className="payee-card__account-count">
                      {payee.accounts.length} accounts
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

function UpdatePayeeForm({
  payee,
  overrides,
  onBack,
}: {
  payee: Payee;
  overrides: Record<string, unknown>;
  onBack: () => void;
}) {
  const sendFollowUp = useSendFollowUpMessage();
  const merged = { ...payee, ...overrides };

  const [payeeName, setPayeeName] = useState(
    (merged.payeeName as string) ?? ""
  );
  const [payeeType, setPayeeType] = useState<"INDIVIDUAL" | "BUSINESS">(
    (merged.payeeType as "INDIVIDUAL" | "BUSINESS") ?? "INDIVIDUAL"
  );
  const [firstName, setFirstName] = useState(
    (merged.firstName as string) ?? ""
  );
  const [middleName, setMiddleName] = useState(
    (merged.middleName as string) ?? ""
  );
  const [lastName, setLastName] = useState((merged.lastName as string) ?? "");
  const [businessName, setBusinessName] = useState(
    (merged.businessName as string) ?? ""
  );
  const [phoneNumber, setPhoneNumber] = useState(
    (merged.phoneNumber as string) ?? ""
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    (merged.dateOfBirth as string) ?? ""
  );

  const {
    callTool: callUpdate,
    isPending: isUpdating,
    isSuccess: updateSuccess,
  } = useCallTool("update-payee");

  const handleSubmit = () => {
    const base: Record<string, unknown> = {
      payeeUid: payee.payeeUid,
      payeeName,
      payeeType,
    };
    if (payeeType === "INDIVIDUAL") {
      if (firstName) base.firstName = firstName;
      if (middleName) base.middleName = middleName;
      if (lastName) base.lastName = lastName;
    } else {
      if (businessName) base.businessName = businessName;
    }
    if (phoneNumber) base.phoneNumber = phoneNumber;
    if (dateOfBirth) base.dateOfBirth = dateOfBirth;

    callUpdate(base as Parameters<typeof callUpdate>[0], {
      onSuccess: () => {
        sendFollowUp(
          `[Update Payee Form] The user submitted the update payee form and 2FA confirmation was requested on their device for payee "${payeeName}".`
        );
      },
    });
  };

  return (
    <div className="payee-form">
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
      <h2 className="payee-form__title">Update Payee</h2>

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

      <button
        className={`payee-form__submit${updateSuccess ? " payee-form__submit--success" : ""}`}
        onClick={handleSubmit}
        disabled={isUpdating || !payeeName}
      >
        {isUpdating && <span className="payee-spinner" />}
        {updateSuccess
          ? "Requested you for confirmation on your device"
          : "Update Payee"}
      </button>
    </div>
  );
}

function UpdatePayeeInner({
  payees,
  selectedPayeeUid,
  overrides,
}: {
  payees: Payee[];
  selectedPayeeUid: string | null;
  overrides: Record<string, unknown>;
}) {
  const preSelectedPayee = selectedPayeeUid
    ? payees.find((p) => p.payeeUid === selectedPayeeUid) ?? null
    : null;

  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(
    preSelectedPayee
  );

  if (!selectedPayee) {
    return (
      <PayeeSelector payees={payees} onSelect={(p) => setSelectedPayee(p)} />
    );
  }

  return (
    <UpdatePayeeForm
      payee={selectedPayee}
      overrides={overrides}
      onBack={() => setSelectedPayee(null)}
    />
  );
}

function DisplayUpdatePayee() {
  const { output } = useToolInfo<"display-update-payee">();

  if (!output) {
    return (
      <div className="payees-container">
        <div className="payee-form">
          <h2 className="payee-form__title">Update Payee</h2>
          <span className="payee-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="payees-container">
      <UpdatePayeeInner
        payees={output.payees ?? []}
        selectedPayeeUid={output.selectedPayeeUid ?? null}
        overrides={output.overrides ?? {}}
      />
    </div>
  );
}

export default DisplayUpdatePayee;
mountWidget(<DisplayUpdatePayee />);
