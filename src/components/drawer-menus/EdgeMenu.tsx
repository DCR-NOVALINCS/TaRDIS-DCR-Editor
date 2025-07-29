import { MoveRight } from "lucide-react";
import { Edge } from "@xyflow/react";
import { useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import {
  Button,
  DrawerMenu,
  DrawerMenuLabel,
  FormDocumentation,
  FormField,
  FormTextarea,
} from "@/lib/reusable-comps";

const selector = (state: RFState) => ({
  updateEdge: state.updateEdge,
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
  const { updateEdge, documentation, addDocumentation } = useStore(
    selector,
    shallow
  );
  const { id, data } = edge as { id: string; data: Record<string, string> };
  const [guard, setGuard] = useState(data.guard || "");

  const handleSave = () => {
    updateEdge(id, {
      ...edge,
      data: { ...data, guard },
      selected: true,
    });
  };

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <MoveRight size={40} />
        Edge {id}
      </DrawerMenuLabel>

      {/* Documentation */}
      <FormDocumentation
        documentation={documentation.get(id)}
        onChange={(e) => addDocumentation(id, e.target.value)}
        key={id}
      />

      {/* Form Fields */}
      <div className="flex flex-col p-3 gap-3">
        {/* Guard */}
        <FormField label="Guard">
          <FormTextarea
            value={guard}
            onChange={(e) => setGuard(e.target.value)}
            placeholder="Guard condition"
          />
        </FormField>

        {/* Save Button */}
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </DrawerMenu>
  );
};

export default EdgeMenu;
