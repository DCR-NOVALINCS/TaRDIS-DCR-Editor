import { useState } from "react";
import { Group } from "lucide-react";

import { Node } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  setSelectedElement: state.setSelectedElement,
  updateNode: state.updateNode,
  getNode: state.getNode,
  addEdge: state.addEdge,
  edges: state.edges,
  setEdges: state.setEdges,
  getFamily: state.getFamily,
});

/**
 * Component that shows the selected subgraph properties.
 * @returns the subgraph menu component.
 */
export const SubgraphMenu = ({ nest }: { nest: Node }) => {
  const {
    nodes,
    setSelectedElement,
    updateNode,
    getNode,
    addEdge,
    edges,
    setEdges,
    getFamily,
  } = useStore(selector);
  const { id, data, parentId } = nest;

  const { marking } = data as { marking: Record<string, boolean> };

  const [type, setType] = useState(nest.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [included, setIncluded] = useState(marking.included as boolean);
  const [pending, setPending] = useState(marking.pending as boolean);
  const [nestType, setNestType] = useState(data.nestType as string);
  const [parent, setParent] = useState(parentId as string);
  const newData = {
    label,
    nestType,
    marking: {
      included,
      pending,
    },
  };

  const family = getFamily(id);

  const onClick = () => {
    const newNode: Node = {
      ...getNode(id),
      type,
      data: newData,
      ...(parent
        ? { parentId: parent, expandParent: true, extent: "parent" }
        : { parentId: "" }),
    };

    const newId = updateNode(id, newNode);
    const children = nodes.filter((nd) => nd.parentId && nd.parentId === id);

    children.forEach((child) => {
      updateNode(child.id, {
        ...child,
        data: {
          ...child.data,
          marking: {
            included,
            pending,
          },
        },
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
    setSelectedElement(getNode(newId));
  };

  return (
    <div className="flex flex-col mr-4 w-full">
      {/* NODE WITH RESPECTIVE ID */}
      <div className="flex items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <Group size={40} />
        Subgraph {id}
      </div>

      {/* DOCUMENTATION OF NODE */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
        <div className="font-bold text-[16px]">Documentation</div>
        <textarea className="bg-white rounded-sm min-h-10 max-h-64 px-1" />
      </div>

      {/* NODE PROPERTIES */}
      <div className="flex flex-col p-3 gap-3">
        {/* LABEL */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Label</label>
          <input
            className="col-span-2 h-8 bg-white rounded-sm px-1 font-mono"
            value={label as string}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
          />
        </div>

        {/* TYPE (NEST OR SUBPROCESS) */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Type</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={type as string}
            onChange={(event) => {
              const value = event.target.value;
              setType(value);
            }}
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
            onChange={(event) => {
              const value = event.target.value;
              setParent(value);
            }}
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
                checked={pending}
                onChange={() => setPending(!pending)}
              />
            </div>
            <div className="flex gap-1 items-center">
              <label>Included</label>
              <input
                type="checkbox"
                checked={included}
                onChange={() => setIncluded(!included)}
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
