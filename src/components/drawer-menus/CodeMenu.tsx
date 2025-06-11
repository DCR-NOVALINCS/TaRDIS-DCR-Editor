import { writeCode } from "@/lib/codegen";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import Editor from "@monaco-editor/react";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  rolesParticipants: state.rolesParticipants,
  security: state.security,
  code: state.code,
  setCode: state.setCode,
  eventMap: state.eventMap,
  setEventMap: state.setEventMap,
  updateNodeInfo: state.updateNodeInfo,
});

/**
 * `CodeMenu` is a React functional component that provides a code editor interface
 * for viewing, editing, generating, and downloading code within the application.
 *
 * Features:
 * - Displays a code editor (Monaco Editor) with Python-like syntax highlighting.
 * - Allows users to generate code based on the current application state (nodes, edges, roles, security).
 * - Enables users to download the current code as a `.txt` file.
 * - (Commented out) Option to save changes made in the editor back to the application's visual state.
 *
 * State Management:
 * - Utilizes a custom store via `useStore` to access and update code, event maps, and related data.
 *
 * UI:
 * - Responsive layout with labeled sections and styled buttons for user actions.
 *
 * @component
 * @returns {JSX.Element} The rendered CodeMenu component.
 */
export default function CodeMenu() {
  const {
    nodes,
    edges,
    rolesParticipants,
    security,
    code,
    setCode,
    setEventMap,
  } = useStore(selector, shallow);

  /**
   * Initiates a download of the current code as a plain text file named "regrada.txt".
   *
   * This function creates a Blob from the `code` variable, generates a temporary object URL,
   * and programmatically triggers a download by creating and clicking an anchor element.
   * After the download is triggered, the anchor is removed from the DOM and the object URL is revoked.
   */
  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "regrada.txt";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2"
      style={{ height: "calc(100vh - 50px)" }}
    >
      <label className="text-lg font-bold">Code</label>
      <Editor
        className="w-full h-[500px]"
        defaultLanguage="python"
        value={code}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          scrollBeyondLastLine: false,
        }}
        onChange={(newCode) => {
          if (newCode) setCode(newCode);
        }}
      />
      <div className="flex gap-2 w-full">
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            const { eventMap, code } = writeCode(
              nodes,
              edges,
              rolesParticipants,
              security
            );
            setEventMap(eventMap);
            setCode(code);
          }}
        >
          Generate Code
        </button>
        {/*
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) {
              const events = modifyRepresentation(code, eventMap);
              events.forEach((ev, id) => {
                updateNodeInfo(id, ev);
              });
            }
          }}
        >
          Save Changes
        </button>
        */}
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) downloadCode();
          }}
        >
          Download Code
        </button>
      </div>
    </div>
  );
}
