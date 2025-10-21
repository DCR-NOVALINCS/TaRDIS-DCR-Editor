import {
  DrawerMenu,
  DrawerMenuLabel,
  FormField,
  FormSelect,
} from "@/lib/reusable-comps";
import { SquareMousePointer } from "lucide-react";
import { Node } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { useEffect, useRef, useState } from "react";
import { shallowEqual } from "@/lib/utils";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  currentProjection: state.currentProjection,
});

const NodesMenu = ({ selectedNodes }: { selectedNodes: Node[] }) => {
  const { nodes, updateNode, currentProjection } = useStore(selector, shallow);

  const [parent, setParent] = useState<string>(() => {
    let parentId = selectedNodes[0].parentId || "";
    for (const node of selectedNodes) {
      if (node.parentId !== parentId) return "";
    }
    return parentId ? parentId : "";
  });

  const parentOptions = [
    ...nodes
      .filter((n) => n.type === "nest" || n.type === "subprocess")
      .map((n) => ({ value: n.id, label: n.data.label as string })),
    { value: "", label: "-" },
    { value: "...", label: "..." },
  ];

  const isGlobalProjection = currentProjection === "global";

  const selectedIds = useRef(selectedNodes.map((n) => n.id));

  useEffect(() => {
    selectedIds.current = selectedNodes.map((n) => n.id);
  }, [selectedNodes]);

  useEffect(() => {
    if (!isGlobalProjection) return;

    for (const id of selectedIds.current) {
      const storeNode = nodes.find((n) => n.id === id);
      if (!storeNode) continue;
      if (storeNode.parentId === parent) continue;

      updateNode(id, {
        ...storeNode,
        selected: true,
        ...(parent
          ? {
              parentId: parent,
              expandParent: true,
              extent: "parent",
            }
          : { parentId: "" }),
      });
    }
  }, [parent, isGlobalProjection, nodes, updateNode]);

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <SquareMousePointer size={40} />
        Nodes {selectedNodes.map((node) => node.id).join(", ")}
      </DrawerMenuLabel>

      {/* Nodes Properties */}
      <div className="flex flex-col p-3 gap-2 overflow-y-auto h-full">
        <FormField label="Parent">
          <FormSelect
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            options={parentOptions}
            disabled={!isGlobalProjection}
          />
        </FormField>
      </div>
      {/* Save Button */}
      {/* isGlobalProjection && (
        <div className="flex justify-center m-2">
          <Button onClick={handleSaveChanges} className="min-h-8 w-full">
            Save Changes
          </Button>
        </div>
      )} */}
    </DrawerMenu>
  );
};
export default NodesMenu;
