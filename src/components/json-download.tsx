import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  rolesParticipants: state.rolesParticipants,
  security: state.security,
  code: state.code,
});

/**
 * A React component that provides a button to download the current application state as a JSON file.
 *
 * This component retrieves `nodes`, `edges`, `rolesParticipants`, and `security` from the application store,
 * serializes them into a JSON structure, and triggers a download of the resulting file when the button is clicked.
 *
 * @component
 * @returns {JSX.Element} A button that, when clicked, downloads the current state as `data.json`.
 *
 * @example
 * <JsonDownload />
 */
export default function JsonDownload() {
  const { nodes, edges, rolesParticipants, security } = useStore(
    selector,
    shallow
  );

  /**
   * Handles the download of the current graph data as a JSON file.
   *
   * This function serializes the current nodes, edges, security settings, and roles with participants
   * into a JSON object, creates a Blob from the JSON string, and triggers a download of the file named "data.json".
   *
   * The function ensures that only the relevant properties of nodes and edges are included in the output.
   * It also maps roles to include their participants.
   *
   * @remarks
   * - The download is triggered by programmatically creating and clicking an anchor element.
   * - The generated object URL is revoked after the download to free up resources.
   */
  const onClick = () => {
    const nodesForJson = nodes.map((node) => {
      const { id, type, parentId, data } = node;

      return {
        id,
        type,
        parentId,
        data,
      };
    });

    const edgesForJson = edges.map((edge) => {
      const { id, source, target, type } = edge;
      return {
        id,
        source,
        target,
        type,
      };
    });

    const data = {
      nodes: nodesForJson,
      edges: edgesForJson,
      security,
      roles: rolesParticipants.map((role) => ({
        ...role,
        participants: role.participants,
      })),
    };

    const jsonString = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* JSON DOWNLOAD BUTTON */}
      <button
        className="bg-black select-none text-white font-semibold px-2 py-1 w-36 rounded-sm m-2 hover:opacity-75 cursor-pointer"
        onClick={onClick}
      >
        Download JSON
      </button>
    </>
  );
}
