import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function UpdatePayee() {
  const { output } = useToolInfo<'update-payee'>();

  if (!output) {
    return (
      <div className="payee-result">
        <div className="payee-result__loading">Updating payee…</div>
      </div>
    );
  }

  if ('isError' in output || !output.success) {
    return (
      <div className="payee-result">
        <div className="payee-result__error">
          <svg className="payee-result__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>Failed to update payee</span>
        </div>
      </div>
    );
  }

  return (
    <div className="payee-result">
      <div className="payee-result__card payee-result__card--success">
        <div className="payee-result__header">
          <svg className="payee-result__icon payee-result__icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div className="payee-result__info">
            <span className="payee-result__name">{output.payeeName}</span>
            <span className="payee-result__status">Payee updated</span>
          </div>
        </div>
        <div className="payee-result__confirmation">
          Requested you for confirmation on your device
        </div>
      </div>
    </div>
  );
}

export default UpdatePayee;
mountWidget(<UpdatePayee />);
