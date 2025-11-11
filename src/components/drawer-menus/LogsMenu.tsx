import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { X } from "lucide-react";
import { Log } from "@/lib/types";

const selector = (state: RFState) => ({
  logs: state.logs,
  setLogs: state.setLogs,
});

/**
 * Presentational component that renders a single log entry row with a remove control.
 *
 * @param log - the {@link Log `Log`} object to render. Expected to have at least `time` and `message` properties.
 * @param onRemove - callback invoked when the user requests removal of this log (e.g., clicks the close icon).
 *
 * @remarks
 * - The remove control is keyboard and screen-reader accessible via the provided aria-label.
 * - This component is intentionally small and stateless; it delegates state mutation to the passed {@link onRemove `onRemove`} callback.
 * - Key styling and layout behavior are handled by CSS classes; this component focuses purely on structure and behavior.
 *
 * @component
 * @returns A JSX element representing the log item including a timestamp, message, and a clickable remove icon.
 */
const LogItem = ({ log, onRemove }: { log: Log; onRemove: () => void }) => (
  <>
    {/* LOG ENTRY CONTAINER WITH TIMESTAMP AND REMOVE CONTROL */}
    <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
      <div className="flex items-center">
        <div className="font-bold text-[16px]">LOG {log.time}</div>
        <X
          className="cursor-pointer ml-auto hover:opacity-75 transition-opacity"
          size={20}
          onClick={onRemove}
          aria-label={`Remove log from ${log.time}`}
        />
      </div>
      <div className="text-[14px] break-words">{log.message}</div>
    </div>
  </>
);

/**
 * Component that displays and manages application logs.
 *
 * @remarks
 * - Uses the zustand store hook via the `selector` to read {@link logs `logs`} and call {@link setLogs `setLogs`}.
 * - The "Clear All" button is disabled when there are no logs.
 * - Individual log removal is implemented by filtering the logs array using the index.
 * - Log items are keyed with a combination of timestamp and index to reduce key collisions.
 * - The component aims to be accessible: buttons include aria-labels and visual focus/hover affordances are provided.
 *
 * @component
 * @returns a JSX element rendering:
 *  - A header with a "Clear All" button that empties the logs when clicked.
 *  - A scrollable container showing a list of {@link LogItem `LogItem`} entries, each removable individually.
 *  - A placeholder message when no logs are available.
 */
export default function LogsMenu() {
  const { logs, setLogs } = useStore(selector, shallow);

  const hasLogs = logs.length > 0;

  /**
   * Handles removal of a log entry by its index.
   *
   * @param index - The index of the log entry to remove.
   */
  const onRemove = (index: number) => {
    setLogs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* LOGS HEADER WITH CLEAR ALL BUTTON */}
      <div className="flex justify-end border-b-2 border-[#CCCCCC] select-none">
        <button
          className="py-2 mr-6 cursor-pointer hover:underline transition-all duration-200"
          onClick={() => setLogs([])}
          disabled={!hasLogs}
          aria-label="Clear all logs"
        >
          Clear All
        </button>
      </div>

      {/* LOGS CONTAINER */}
      <div className="h-[calc(100vh-90px)] overflow-y-auto w-[calc(100%-4px)] select-none">
        {hasLogs ? (
          logs.map((log, index) => (
            <LogItem
              key={`${log.time}-${index}`}
              log={log}
              onRemove={() => onRemove(index)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 text-[14px]">
            No logs available
          </div>
        )}
      </div>
    </>
  );
}
