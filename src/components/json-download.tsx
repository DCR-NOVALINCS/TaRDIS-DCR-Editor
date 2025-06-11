import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  rolesParticipants: state.rolesParticipants,
  security: state.security,
});

/**
 * Button to download a JSON file containing the choreography nodes and edges.
 * @returns button to download JSON file.
 */
export default function JsonDownload() {
  const { nodes, edges, rolesParticipants, security } = useStore(
    selector,
    shallow
  );

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
        className="bg-black text-white font-semibold px-2 py-1 w-36 rounded-sm m-2 hover:opacity-75 cursor-pointer"
        onClick={onClick}
      >
        Download JSON
      </button>
    </>
  );
}
