import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

function GetUuid() {
  const { output } = useToolInfo<"get-uuid">();

  if (!output) {
    return (
      <div className="payee-result">
        <div className="payee-result__loading">Generating UUID...</div>
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
            <span
              className="payee-result__name"
              style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            >
              {output.uuid}
            </span>
            <span className="payee-result__status">UUID generated</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GetUuid;
mountWidget(<GetUuid />);
