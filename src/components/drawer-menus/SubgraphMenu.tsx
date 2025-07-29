import { useState } from "react";
import { Group } from "lucide-react";
import { Node } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";
import { MarkingType } from "@/lib/types";
import {
  Button,
  DrawerMenu,
  DrawerMenuLabel,
  FormCheckbox,
  FormDocumentation,
  FormField,
  FormSelect,
  FormTextarea,
} from "@/lib/reusable-comps";

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

  // Form state
  const [type, setType] = useState(nest.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [marking, setMarking] = useState(data.marking as MarkingType);
  const [nestType, setNestType] = useState(data.nestType as string);
  const [parent, setParent] = useState(parentId as string);

  const family = getFamily(id);

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

  const handleSave = () => {
    const newData = { label, nestType, marking };
    const nodeUpdate: Node = {
      ...nest,
      type,
      data: newData,
      ...(parent
        ? { parentId: parent, expandParent: true, extent: "parent" }
        : { parentId: "" }),
    };

    const newId = updateNode(id, nodeUpdate);
    const children = nodes.filter((nd) => nd.parentId === id);

    // Update children
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
    });

    // Handle edge management
    handleEdgeManagement(children);
  };

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
      <DrawerMenuLabel>
        <Group size={40} />
        Subgraph {id}
      </DrawerMenuLabel>

      {/* Documentation */}
      <FormDocumentation
        documentation={documentation.get(id)}
        onChange={(e) => addDocumentation(id, e.target.value)}
        key={id}
      />

      {/* Form Fields */}
      <div className="flex flex-col p-3 gap-3">
        {/* Label */}
        <FormField label="Label">
          <FormTextarea
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={type === "nest" ? `Nest label` : "Subprocess Label"}
          />
        </FormField>

        {/* Type */}
        <FormField label="Type">
          <FormSelect
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={typeOptions}
          />
        </FormField>

        {/* Nest Type - only show for nest type */}
        {type === "nest" && (
          <FormField label="Nest Type">
            <FormSelect
              value={nestType}
              onChange={(e) => setNestType(e.target.value)}
              options={nestTypeOptions}
            />
          </FormField>
        )}

        {/* Parent */}
        <FormField label="Parent">
          <FormSelect
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            options={parentOptions}
          />
        </FormField>

        {/* Marking - only show for nest type */}
        {type === "nest" && (
          <div className="grid grid-cols-3 gap-5">
            <label>Marking</label>
            <FormCheckbox
              label="Pending"
              checked={marking.pending}
              onChange={() => toggleMarking("pending")}
            />
            <FormCheckbox
              label="Included"
              checked={marking.included}
              onChange={() => toggleMarking("included")}
            />
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </DrawerMenu>
  );
};

export default SubgraphMenu;
