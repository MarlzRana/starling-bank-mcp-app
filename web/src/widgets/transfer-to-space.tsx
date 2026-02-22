import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function TransferToSpace() {
  const { output } = useToolInfo<"transfer-to-space">();

  if (!output) {
    return (
      <div className="payee-result">
        <div className="payee-result__loading">Transferring...</div>
      </div>
    );
  }

  if ("isError" in output || !output.success) {
    return (
      <div className="payee-result">
        <div className="payee-result__error">
          <svg
            className="payee-result__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>Failed to transfer</span>
        </div>
      </div>
    );
  }

  return (
    <div className="payee-result">
      <div className="payee-result__card">
        <div className="payee-result__header">
          <svg
            className="payee-result__icon payee-result__icon--success"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div className="payee-result__info">
            <span className="payee-result__name">Transfer complete</span>
            <span
              className="payee-result__status"
              style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            >
              {output.transferUid}
            </span>
          </div>
        </div>
        <div className="payee-result__confirmation">Transfer complete</div>
      </div>
    </div>
  );
}

export default TransferToSpace;
mountWidget(<TransferToSpace />);
