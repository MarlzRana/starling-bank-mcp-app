import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function DeleteRecurringTransferInternal() {
  const { output } =
    useToolInfo<"delete-recurring-transfer-to-space-internal">();

  if (!output) {
    return (
      <div className="payee-result">
        <div className="payee-result__loading">Deleting...</div>
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
          <span>Failed to delete recurring transfer</span>
        </div>
      </div>
    );
  }

  return (
    <div className="payee-result">
      <div className="payee-result__card payee-result__card--deleted">
        <div className="payee-result__header">
          <svg
            className="payee-result__icon payee-result__icon--deleted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <div className="payee-result__info">
            <span className="payee-result__name">
              Recurring transfer deleted
            </span>
          </div>
        </div>
        <div className="payee-result__confirmation">
          Recurring transfer has been removed
        </div>
      </div>
    </div>
  );
}

export default DeleteRecurringTransferInternal;
mountWidget(<DeleteRecurringTransferInternal />);
