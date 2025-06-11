import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { X } from "lucide-react";

const selector = (state: RFState) => ({
  logs: state.logs,
  setLogs: state.setLogs,
});

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

  return (
    <>
      <div className="flex justify-end border-b-2 border-[#CCCCCC]">
        <button
          className="py-2 mr-6 cursor-pointer hover:underline"
          onClick={() => setLogs([])}
        >
          Clear All
        </button>
      </div>
      <div className="h-[calc(100vh-90px)] overflow-y-auto w-[calc(100%-1rem)]">
        {logs.map((log, index) => (
          <div
            key={index}
            className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]"
          >
            <div className="flex">
              <div className="font-bold text-[16px]">LOG {log.time}</div>
              <X
                className="cursor-pointer ml-auto"
                onClick={() => setLogs(logs.filter((_, i) => i !== index))}
              />
            </div>
            <div>{log.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}
