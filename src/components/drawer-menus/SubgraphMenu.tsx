import { useEffect, useRef, useState } from "react";
import { Group } from "lucide-react";
import { Node } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";
import { MarkingType } from "@/lib/types";
import {
  DrawerMenu,
  DrawerMenuLabel,
  FormCheckbox,
  FormDocumentation,
  FormField,
  FormSelect,
  FormTextarea,
} from "@/lib/reusable-comps";
import { shallowEqual } from "@/lib/utils";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  addEdge: state.addEdge,
  edges: state.edges,
  setEdges: state.setEdges,
  getFamily: state.getFamily,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  isGlobalProjection: state.isGlobalProjection,
});

/**
 * Renders the properties editor for a subgraph node (also called a "nest" or "subprocess")
 * and manages syncing changes back to the global store.
 *
 * The component is designed to work with a central store (via {@link useStore `useStore`}) that
 * exposes node/edge manipulation helpers and projection/documentation flags.
 *
 * @param nest - the {@link Node `Node`} object representing the subgraph to edit. Expected shape:
 *
 * Behavior / Side effects:
 * - Maintains local UI state for editable fields: `type`, `label`, `marking`, `nestType`, `parent`.
 * - When the application is in a `"global"` state ({@link isGlobalProjection `isGlobalProjection`} evaluates to `true`),
 *   the component auto-saves changes to the store using a short debounce.
 *   Auto-save updates:
 *     - The node's type, data (`label`, `nestType`, `marking`) and parent relationship (`parentId`, `expandParent`, `extent`)
 *     - The children of the subgraph: children nodes' `parentId` are adjusted to the possibly new node id
 *       and their `data.marking` is synchronized with the subgraph marking.
 *     - Edge management: for nests with `nestType === "choice"`, mutual "exclude" hidden edges are
 *       created between children; otherwise edges created for this parent are removed.
 * - Avoids unnecessary writes by comparing the stored node's data/type/parent to the current UI state
 *   using shallow equality before scheduling an update.
 *
 * UI:
 * - Shows a drawer menu header with the subgraph id and an icon.
 * - Optionally displays a documentation textarea ({@link isGlobalProjection `isGlobalProjection`} evaluates to `true`) backed by
 *   {@link documentation `documentation.get(id)`} and {@link addDocumentation `addDocumentation`}.
 * - Presents form controls for:
 *   - Label (`textarea`, spaces replaced with underscores in UI)
 *   - Type (`select: "nest" | "subprocess"`)
 *   - Nest Type (`select: "group" | "choice"`, shown only when `type === "nest"`)
 *   - Parent (select of possible parent nodes, excludes events, family members, and self)
 *   - Marking (checkboxes for pending / included, shown only when `type === "nest"`)
 * - Controls are disabled when not in global choreography mode.
 *
 * Implementation notes:
 * - Debounce timeout is intentionally very short (10ms) to batch quick UI changes.
 * - Edge creation uses ids of the form `e-${child.id}-${otherChild.id}` and sets `edge.type = "exclude"`,
 *   `edge.hidden = true` and `edge.data.parent = <subgraph id>`.
 * - Removes edges by filtering those whose `data.parent` equals the subgraph id.
 * - Uses {@link shallowEqual `shallowEqual`} to reduce unnecessary updates.
 *
 * @component
 * @returns a JSX Element with the drawer UI for editing the provided subgraph node.
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
    isGlobalProjection,
  } = useStore(selector);
  const { id, data, parentId } = nest;

  const [type, setType] = useState(nest.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [marking, setMarking] = useState(data.marking as MarkingType);
  const [nestType, setNestType] = useState(data.nestType as string);
  const [parent, setParent] = useState(parentId as string);

  const family = getFamily(id);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Manages edges for the given child nodes.
   *
   * @param children - The child nodes to manage edges for.
   */
  const handleEdgeManagement = (children: Node[]) => {
    if (type !== "nest") return;

    if (nestType === "choice") {
      children.forEach((child) => {
        children.forEach((otherChild) => {
          if (child.id !== otherChild.id) {
            addEdge({
              id: `e-${child.id}-${otherChild.id}`,
              type: "exclude",
              source: child.id,
              target: otherChild.id,
              hidden: true,
              data: { parent: id },
            });
          }
        });
      });
    } else {
      const edgesToRemove = edges.filter(
        (edge) => edge.data && edge.data.parent === id
      );
      setEdges(edges.filter((edge) => !edgesToRemove.includes(edge)));
    }
  };

  useEffect(() => {
    if (!isGlobalProjection()) return;

    const storeNode = nodes.find((n) => n.id === id);
    if (!storeNode) return;

    const newData = { label, nestType, marking };
    if (
      shallowEqual(storeNode.data, newData) &&
      storeNode.type === type &&
      storeNode.parentId === parent
    )
      return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      const nodeUpdate: Node = {
        ...storeNode,
        type,
        data: newData,
        ...(parent
          ? { parentId: parent, expandParent: true, extent: "parent" }
          : { parentId: "" }),
      };

      const newId = updateNode(id, nodeUpdate);
      const children = nodes.filter((nd) => nd.parentId === id);

      children.forEach((child) => {
        updateNode(child.id, {
          ...child,
          parentId: newId,
          data: {
            ...child.data,
            marking,
          },
        });
      });

      handleEdgeManagement(children);
    }, 10);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [
    type,
    label,
    marking,
    nestType,
    parent,
    isGlobalProjection,
    id,
    nodes,
    edges,
  ]);

  /**
   * Toggles the marking state for a specific field.
   *
   * @param field - The field to toggle.
   */
  const toggleMarking = (field: keyof MarkingType) => {
    setMarking((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const typeOptions = [
    { value: "nest", label: "Nest" },
    { value: "subprocess", label: "Subprocess" },
  ];

  const nestTypeOptions = [
    { value: "group", label: "Group" },
    { value: "choice", label: "Choice" },
  ];

  const parentOptions = [
    ...nodes
      .filter(
        (n) => n.type !== "event" && !family.includes(n.id) && n.id !== id
      )
      .map((n) => ({ value: n.id, label: n.data.label as string })),
    { value: "", label: "-" },
  ];

  return (
    <DrawerMenu>
      {/* DRAWER HEADER */}
      <DrawerMenuLabel>
        <Group size={40} />
        Subgraph {id}
      </DrawerMenuLabel>

      {/* DOCUMENTATION */}
      {isGlobalProjection() && (
        <FormDocumentation
          documentation={documentation.get(id)}
          onChange={(e) => addDocumentation(id, e.target.value)}
          key={id}
        />
      )}

      {/* FORM FIELD FOR LABEL */}
      <div className="flex flex-col p-3 gap-3">
        <FormField label="Label">
          <FormTextarea
            value={label}
            onChange={(e) => setLabel(e.target.value.replace(" ", "_"))}
            placeholder={type === "nest" ? `Nest label` : "Subprocess Label"}
            disabled={!isGlobalProjection()}
          />
        </FormField>

        {/* FORM FIELD FOR TYPE */}
        <FormField label="Type">
          <FormSelect
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={typeOptions}
            disabled={!isGlobalProjection()}
          />
        </FormField>

        {/* NEST TYPE - ONLY FOR NEST SUBGRAPHS */}
        {type === "nest" && (
          <FormField label="Nest Type">
            <FormSelect
              value={nestType}
              onChange={(e) => setNestType(e.target.value)}
              options={nestTypeOptions}
              disabled={!isGlobalProjection()}
            />
          </FormField>
        )}

        {/* FORM FIELD FOR PARENT */}
        <FormField label="Parent">
          <FormSelect
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            options={parentOptions}
            disabled={!isGlobalProjection()}
          />
        </FormField>

        {/* FORM FIELD FOR MARKING */}
        {type === "nest" && (
          <div className="grid grid-cols-3 gap-5">
            <label>Marking</label>
            <FormCheckbox
              label="Pending"
              checked={marking.pending}
              onChange={() => toggleMarking("pending")}
              disabled={!isGlobalProjection}
            />
            <FormCheckbox
              label="Included"
              checked={marking.included}
              onChange={() => toggleMarking("included")}
              disabled={!isGlobalProjection}
            />
          </div>
        )}
      </div>
    </DrawerMenu>
  );
};

export default SubgraphMenu;
