import { useState } from "react";
import { Group } from "lucide-react";

import { Node } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";
import { MarkingType } from "@/lib/types";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  addEdge: state.addEdge,
  edges: state.edges,
  setEdges: state.setEdges,
  getFamily: state.getFamily,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  updateNodeInfo: state.updateNodeInfo,
});

/**
 * Renders a menu for editing the properties of a subgraph node (nest or subprocess) in the graph editor.
 *
 * @param nest - The node object representing the subgraph to be edited.
 *
 * The menu allows users to:
 * - Edit the label, type (nest or subprocess), nest type (group or choice), parent, and marking (pending/included) of the node.
 * - View and edit the documentation associated with the node.
 * - Save changes, which updates the node and its children, and manages edges according to the selected nest type.
 *
 * Uses application state from `useStore` for node and edge management.
 */
const SubgraphMenu = ({ nest }: { nest: Node }) => {
  const {
    nodes,
    updateNode,
    addEdge,
    edges,
    setEdges,
    getFamily,
    documentation,
    addDocumentation,
    updateNodeInfo,
  } = useStore(selector);
  const { id, data, parentId } = nest;

  const [type, setType] = useState(nest.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [marking, setMarking] = useState(data.marking as MarkingType);
  const [nestType, setNestType] = useState(data.nestType as string);
  const [parent, setParent] = useState(parentId as string);
  const newData = {
    label,
    nestType,
    marking,
  };

  const family = getFamily(id);

  const onClick = () => {
    const newId = updateNode(id, {
      ...nest,
      type,
      data: newData,
      ...(parent
        ? { parentId: parent, expandParent: true, extent: "parent" }
        : { parentId: "" }),
    });
    const children = nodes.filter((nd) => nd.parentId && nd.parentId === id);

    children.forEach((child) => {
      updateNodeInfo(child.id, {
        id: "",
        initiators: [],
        label: "",
        marking,
        name: "",
        security: "",
        parent: newId,
      });
      if (type === "nest") {
        if (nestType === "choice") {
          children.forEach((otherChild) => {
            addEdge({
              id: "e-" + child.id + "-" + otherChild.id,
              type: "exclude",
              source: child.id,
              target: otherChild.id,
              hidden: true,
              data: {
                parent: id,
              },
            });
          });
        } else {
          setEdges(
            edges.filter((edge) => {
              const parent = edge.data ? (edge.data.parent as string) : "";
              return !(parent && parent === id);
            })
          );
        }
      }
    });
  };

  return (
    <div className="flex flex-col mr-4 w-full select-none">
      {/* NODE WITH RESPECTIVE ID */}
      <div className="flex items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <Group size={40} />
        Subgraph {id}
      </div>

      {/* DOCUMENTATION OF NODE */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
        <div className="font-bold text-[16px]">Documentation</div>
        <textarea
          className="bg-white rounded-sm min-h-16 max-h-64 p-1 h-16 text-[14px]"
          value={documentation.get(id)}
          onChange={(event) => addDocumentation(id, event.target.value)}
        />
      </div>

      {/* NODE PROPERTIES */}
      <div className="flex flex-col p-3 gap-3">
        {/* LABEL */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Label</label>
          <input
            className="col-span-2 h-8 bg-white rounded-sm px-1 font-mono"
            value={label as string}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        {/* TYPE (NEST OR SUBPROCESS) */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Type</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={type as string}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="nest">Nest</option>
            <option value="subprocess">Subprocess</option>
          </select>
        </div>

        {/* NEST TYPE (GROUP OR CHOICE) */}
        {type === "nest" && (
          <div className="grid grid-cols-3 items-center gap-4">
            <label>Nest Type</label>
            <select
              className="col-span-2 h-8 bg-white rounded-sm font-mono"
              value={nestType as string}
              onChange={(event) => setNestType(event.target.value)}
            >
              <option value="group">Group</option>
              <option value="choice">Choice</option>
            </select>
          </div>
        )}

        {/* PARENT */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Parent</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={parent as string}
            onChange={(event) => setParent(event.target.value)}
          >
            {nodes
              .filter(
                (nd) =>
                  nd.type !== "event" && !family.includes(nd.id) && nd.id !== id
              )
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data.label as string}
                </option>
              ))}
            <option value="">-</option>
          </select>
        </div>

        {/* MARKING (PENDING, INCLUDED) */}
        {type === "nest" && (
          <div className="grid grid-cols-3 gap-5">
            <label>Marking</label>
            <div className="flex gap-1 items-center">
              <label>Pending</label>
              <input
                type="checkbox"
                checked={marking.pending}
                onChange={() =>
                  setMarking((prev) => ({ ...prev, pending: !prev.pending }))
                }
              />
            </div>
            <div className="flex gap-1 items-center">
              <label>Included</label>
              <input
                type="checkbox"
                checked={marking.included}
                onChange={() =>
                  setMarking((prev) => ({ ...prev, included: !prev.included }))
                }
              />
            </div>
          </div>
        )}

        {/* SAVE CHANGES BUTTON */}
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          type="submit"
          onClick={onClick}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SubgraphMenu;
