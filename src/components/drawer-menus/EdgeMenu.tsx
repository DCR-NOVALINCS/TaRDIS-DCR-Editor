import { MoveRight } from "lucide-react";
import { Edge } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import {
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
  currentProjection: state.currentProjection,
});

/**
 *
 * @param param0
 * @returns
 */
const EdgeMenu = ({ edge }: { edge: Edge }) => {
  const { updateEdge, documentation, addDocumentation, currentProjection } =
    useStore(selector, shallow);
  const { id, data } = edge as { id: string; data: Record<string, string> };
  const [guard, setGuard] = useState(data.guard || "");

  const isGlobalProjection = currentProjection === "global";
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isGlobalProjection) return;
    // Only update if guard actually changed
    if (data.guard === guard) return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      updateEdge(id, {
        ...edge,
        data: { ...data, guard },
        selected: true,
      });
    }, 200);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard, isGlobalProjection, id, data, edge]);

  /* const handleSave = () => {
    updateEdge(id, {
      ...edge,
      data: { ...data, guard },
      selected: true,
    });
  }; */

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <MoveRight size={40} />
        Edge {id}
      </DrawerMenuLabel>

      {/* Documentation */}
      {isGlobalProjection && (
        <FormDocumentation
          documentation={documentation.get(id)}
          onChange={(e) => addDocumentation(id, e.target.value)}
          key={id}
        />
      )}

      {/* Form Fields */}
      <div className="flex flex-col p-3 gap-3">
        {/* Guard */}
        <FormField label="Guard">
          <FormTextarea
            value={guard}
            onChange={(e) => setGuard(e.target.value)}
            placeholder="Guard condition"
            disabled={!isGlobalProjection}
          />
        </FormField>

        {/* Save Button */}
        {/* isGlobalProjection && (
          <Button onClick={handleSave}>Save Changes</Button>
        )*/}
      </div>
    </DrawerMenu>
  );
};

export default EdgeMenu;
