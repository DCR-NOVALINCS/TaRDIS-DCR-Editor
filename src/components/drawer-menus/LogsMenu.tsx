import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { X } from "lucide-react";
import { Log } from "@/lib/types";

const selector = (state: RFState) => ({
  logs: state.logs,
  setLogs: state.setLogs,
});

const LogItem = ({ log, onRemove }: { log: Log; onRemove: () => void }) => (
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
);

/**
 * Displays a menu for viewing and managing application logs.
 *
 * This component renders a list of log entries, each with a timestamp and message.
 * Users can remove individual log entries or clear all logs at once.
 *
 * @component
 * @returns {JSX.Element} The rendered LogsMenu component.
 *
 * @remarks
 * - Uses a store hook to access and update the logs state.
 * - Each log entry can be individually removed by clicking the close icon.
 * - The "Clear All" button removes all log entries.
 */
export default function LogsMenu() {
  const { logs, setLogs } = useStore(selector, shallow);

  const hasLogs = logs.length > 0;

  return (
    <>
      {/* Header with Clear All button */}
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

      {/* Logs container */}
      <div className="h-[calc(100vh-90px)] overflow-y-auto w-[calc(100%-4px)] select-none">
        {hasLogs ? (
          logs.map((log, index) => (
            <LogItem
              key={`${log.time}-${index}`}
              log={log}
              onRemove={() => setLogs(logs.filter((_, i) => i !== index))}
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
