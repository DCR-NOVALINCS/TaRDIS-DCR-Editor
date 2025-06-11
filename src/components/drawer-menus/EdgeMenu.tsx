import { MoveRight } from "lucide-react";

import { Edge } from "@xyflow/react";
import { useState } from "react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  updateEdge: state.updateEdge,
  setSelectedElement: state.setSelectedElement,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
});

/**
 * EdgeMenu component provides a UI for editing the properties of an edge in a graph.
 *
 * @param {Edge} edge - The edge object to be edited, containing its id and data.
 *
 * Features:
 * - Displays the edge's identifier.
 * - Allows editing and saving of the edge's guard property.
 * - Displays and updates documentation associated with the edge.
 * - Uses a store for state management, including updating the edge and documentation.
 *
 * @remarks
 * This component assumes the presence of a global store (via `useStore`) for managing edges and their documentation.
 */
const EdgeMenu = ({ edge }: { edge: Edge }) => {
  const { updateEdge, setSelectedElement, documentation, addDocumentation } =
    useStore(selector, shallow);
  const { id, data } = edge as { id: string; data: Record<string, string> };
  const [guard, setGuard] = useState(data.guard);

  return (
    <div className="flex flex-col mr-4 w-full">
      {/* EDGE WITH RESPECTIVE NODE */}
      <div className="flex items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <MoveRight size={40} />
        Edge {id}
      </div>

      {/* DOCUMENTATION OF EDGE */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
        <div className="font-bold text-[16px]">Documentation</div>
        <textarea
          className="bg-white rounded-sm min-h-16 max-h-64 p-1 h-16 text-[14px]"
          value={documentation.get(id)}
          onChange={(event) => addDocumentation(id, event.target.value)}
        />
      </div>
      <div className="flex flex-col p-3 gap-3">
        {/* GUARD */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Guard</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={guard}
            onChange={(event) => setGuard(event.target.value)}
          />
        </div>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          type="button"
          onClick={() =>
            updateEdge(id, { ...edge, data: { guard }, selected: true })
          }
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EdgeMenu;
