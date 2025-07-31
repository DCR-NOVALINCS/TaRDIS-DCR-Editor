import { useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { SquareMousePointer } from "lucide-react";
import { Node } from "@xyflow/react";
import { FieldType, InputType, inputTypes, MarkingType } from "@/lib/types";
import {
  Button,
  DrawerMenu,
  DrawerMenuLabel,
  FormCheckbox,
  FormDocumentation,
  FormField,
  FormSelect,
  FormTextarea,
  RecordFieldManager,
} from "@/lib/reusable-comps";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  currentProjection: state.currentProjection,
});

// Input Configuration Component
const InputConfiguration = ({
  input,
  setInput,
  recordField,
  setRecordField,
  disabled,
}: {
  input: InputType;
  setInput: React.Dispatch<React.SetStateAction<InputType>>;
  recordField: FieldType;
  setRecordField: React.Dispatch<React.SetStateAction<FieldType>>;
  disabled: boolean;
}) => {
  const inputTypeOptions = inputTypes.map((type) => ({
    value: type,
    label: type,
  }));

  return (
    <div className="flex flex-col gap-4">
      <label className="col-span-3 flex justify-center font-bold">
        Input Values
      </label>

      <FormField label="Type" newClassName={true} className="grid grid-cols-3">
        <FormSelect
          value={input.type}
          onChange={(e) =>
            setInput((prev) => ({ ...prev, type: e.target.value }))
          }
          options={inputTypeOptions}
          className="col-span-1"
          disabled={disabled}
        />
      </FormField>

      {input.type === "Record" && (
        <RecordFieldManager
          input={input}
          setInput={setInput}
          recordField={recordField}
          setRecordField={setRecordField}
          disabled={disabled}
        />
      )}
    </div>
  );
};

// Computation Expression Component
const ComputationExpression = ({
  expression,
  setExpression,
  disabled,
}: {
  expression: string;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  disabled: boolean;
}) => (
  <>
    <label className="col-span-3 flex justify-center font-bold">
      Computation Expression
    </label>
    <textarea
      className="col-span-3 min-h-24 max-h-72 h-24 bg-white rounded-sm p-1 font-mono"
      value={expression}
      onChange={(e) => setExpression(e.target.value)}
      disabled={disabled}
    />
  </>
);

const NodeProperties = ({
  initiators,
  setInitiators,
  receivers,
  setReceivers,
  type,
  setType,
  label,
  setLabel,
  name,
  setName,
  marking,
  setMarking,
  parent,
  setParent,
  security,
  setSecurity,
  input,
  setInput,
  expression,
  setExpression,
  recordField,
  setRecordField,
  nodes,
  disabled,
}: {
  initiators: string[];
  setInitiators: React.Dispatch<React.SetStateAction<string[]>>;
  receivers: string[];
  setReceivers: React.Dispatch<React.SetStateAction<string[]>>;
  type: string;
  setType: React.Dispatch<React.SetStateAction<string>>;
  label: string;
  setLabel: React.Dispatch<React.SetStateAction<string>>;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  marking: MarkingType;
  setMarking: React.Dispatch<React.SetStateAction<MarkingType>>;
  parent: string;
  setParent: React.Dispatch<React.SetStateAction<string>>;
  security: string;
  setSecurity: React.Dispatch<React.SetStateAction<string>>;
  input: InputType;
  setInput: React.Dispatch<React.SetStateAction<InputType>>;
  expression: string;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  recordField: FieldType;
  setRecordField: React.Dispatch<React.SetStateAction<FieldType>>;
  nodes: Node[];
  disabled: boolean;
}) => {
  // Helper functions for array transformations
  const handleArrayChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(
      value.split(", ").map((val) => val.charAt(0).toUpperCase() + val.slice(1))
    );
  };

  const typeOptions = [
    { value: "i", label: "Input" },
    { value: "c", label: "Computation" },
  ];

  const parentOptions = [
    ...nodes
      .filter((n) => n.type === "nest" || n.type === "subprocess")
      .map((n) => ({ value: n.id, label: n.data.label as string })),
    { value: "", label: "-" },
  ];

  return (
    <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC] overflow-y-auto h-full">
      {/* Basic Properties */}
      <FormField label="Initiators">
        <FormTextarea
          value={initiators.join(", ")}
          onChange={(e) => handleArrayChange(e.target.value, setInitiators)}
          placeholder="Initiators"
          required
          disabled={disabled}
        />
      </FormField>

      <FormField label="Receivers">
        <FormTextarea
          value={receivers.join(", ")}
          onChange={(e) => handleArrayChange(e.target.value, setReceivers)}
          placeholder="Receivers"
          disabled={disabled}
        />
      </FormField>

      <FormField label="Type">
        <FormSelect
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
          disabled={disabled}
        />
      </FormField>

      <FormField label="Label">
        <FormTextarea
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Event label"
          required
          disabled={disabled}
        />
      </FormField>

      <FormField label="Event">
        <FormTextarea
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          required
          disabled={disabled}
        />
      </FormField>

      {/* Marking Section */}
      <div className="grid grid-cols-3 gap-5">
        <label>Marking</label>
        <FormCheckbox
          label="Pending"
          checked={marking.pending}
          onChange={() =>
            setMarking((prev) => ({ ...prev, pending: !prev.pending }))
          }
          disabled={disabled}
        />
        <FormCheckbox
          label="Included"
          checked={marking.included}
          onChange={() =>
            setMarking((prev) => ({ ...prev, included: !prev.included }))
          }
          disabled={disabled}
        />
      </div>

      <FormField label="Parent">
        <FormSelect
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          options={parentOptions}
          disabled={disabled}
        />
      </FormField>

      <FormField label="Security">
        <FormTextarea
          value={security}
          onChange={(e) => setSecurity(e.target.value)}
          placeholder="Security label"
          required
          disabled={disabled}
        />
      </FormField>

      {/* Type-specific sections */}
      {type === "i" && input ? (
        <InputConfiguration
          input={input}
          setInput={setInput}
          recordField={recordField}
          setRecordField={setRecordField}
          disabled={disabled}
        />
      ) : (
        <ComputationExpression
          expression={expression}
          setExpression={setExpression}
          disabled={disabled}
        />
      )}
    </div>
  );
};

/**
 * Renders a menu for editing the properties of a given node in the editor.
 *
 * The `NodeMenu` component provides a user interface for viewing and modifying
 * various properties of a node, such as initiators, receivers, type, label, event name,
 * marking status, parent, security, and input or computation expression details.
 * It also allows editing of node-specific documentation and supports dynamic input types,
 * including record fields for input nodes.
 *
 * @param {Node} node - The node object whose properties are being edited.
 *
 * Features:
 * - Displays and allows editing of node documentation.
 * - Supports editing of initiators, receivers, type (input or computation), label, event name, marking, parent, and security.
 * - For input nodes, allows configuration of input type and record fields.
 * - For computation nodes, allows editing of the computation expression.
 * - Provides a save button to persist changes to the node.
 *
 * @returns {JSX.Element} The rendered node menu component.
 */
const NodeMenu = ({ node }: { node: Node }) => {
  const {
    nodes,
    updateNode,
    documentation,
    addDocumentation,
    currentProjection,
  } = useStore(selector, shallow);
  const { id, data, parentId } = node;

  // State management
  const [initiators, setInitiators] = useState(data.initiators as string[]);
  const [receivers, setReceivers] = useState(
    data.receivers ? (data.receivers as string[]) : [""]
  );
  const [type, setType] = useState(data.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [name, setName] = useState(data.name as string);
  const [marking, setMarking] = useState(data.marking as MarkingType);
  const [parent, setParent] = useState(parentId as string);
  const [security, setSecurity] = useState(data.security as string);
  const [input, setInput] = useState(data.input as InputType);
  const [expression, setExpression] = useState(
    (data.expression as string) ?? ""
  );
  const [recordField, setRecordField] = useState<FieldType>({
    var: "",
    type: inputTypes[0],
  });

  const isGlobalProjection = currentProjection === "global";

  const handleSaveChanges = () => {
    const newData = {
      initiators,
      receivers,
      type,
      label,
      name,
      marking,
      ...(type === "i" ? { input } : { expression }),
      security,
    };

    updateNode(id, {
      ...node,
      data: newData,
      selected: true,
      ...(parent
        ? {
            parentId: parent,
            expandParent: true,
            extent: "parent",
          }
        : { parentId: "" }),
    });
  };

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <SquareMousePointer size={40} />
        Node {id}
      </DrawerMenuLabel>

      {/* Documentation */}
      {isGlobalProjection && (
        <FormDocumentation
          documentation={documentation.get(id)}
          onChange={(e) => addDocumentation(id, e.target.value)}
          key={id}
        />
      )}

      {/* Node Properties */}
      <NodeProperties
        initiators={initiators}
        setInitiators={setInitiators}
        receivers={receivers}
        setReceivers={setReceivers}
        type={type}
        setType={setType}
        label={label}
        setLabel={setLabel}
        name={name}
        setName={setName}
        marking={marking}
        setMarking={setMarking}
        parent={parent}
        setParent={setParent}
        security={security}
        setSecurity={setSecurity}
        input={input}
        setInput={setInput}
        expression={expression}
        setExpression={setExpression}
        recordField={recordField}
        setRecordField={setRecordField}
        nodes={nodes}
        disabled={!isGlobalProjection}
      />

      {/* Save Button */}
      {isGlobalProjection && (
        <div className="flex justify-center m-2">
          <Button onClick={handleSaveChanges} className="min-h-8 w-full">
            Save Changes
          </Button>
        </div>
      )}
    </DrawerMenu>
  );
};

export default NodeMenu;
