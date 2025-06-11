import { MoveRight } from "lucide-react";

import { Edge } from "@xyflow/react";
import { useState } from "react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  updateEdge: state.updateEdge,
  setSelectedElement: state.setSelectedElement,
  log: state.log,
});

/**
 * Component that shows the selected edge properties.
 * @returns the edge menu component.
 */
export const EdgeMenu = ({ edge }: { edge: Edge }) => {
  const { updateEdge, setSelectedElement, log } = useStore(selector, shallow);
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
        <textarea className="bg-white rounded-sm min-h-10 max-h-64 p-1" />
      </div>
      <div className="flex flex-col p-3 gap-3">
        {/* GUARD */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Guard</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={guard}
            onChange={(event) => {
              const val = event.target.value;
              setGuard(val);
            }}
          />
        </div>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          type="button"
          onClick={() => {
            const newEdge = { ...edge, data: { guard }, selected: true };
            updateEdge(id, newEdge);
            setSelectedElement(newEdge);
            log(`Edge ${id} updated.`);
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};
