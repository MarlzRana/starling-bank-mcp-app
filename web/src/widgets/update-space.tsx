import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function UpdateSpace() {
  const { output } = useToolInfo<'update-space'>();

  if (!output) {
    return (
      <div className="payee-result">
        <div className="payee-result__loading">Updating space…</div>
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
          <span>Failed to update space</span>
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
            <span className="payee-result__name">{output.name}</span>
            <span className="payee-result__status">Space updated</span>
          </div>
        </div>
        <div className="payee-result__confirmation">
          Space updated successfully
        </div>
      </div>
    </div>
  );
}

export default UpdateSpace;
mountWidget(<UpdateSpace />);
