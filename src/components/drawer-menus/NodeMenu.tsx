import { useEffect, useRef, useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { SquareMousePointer } from "lucide-react";
import { Node } from "@xyflow/react";
import { inputTypes } from "@/lib/types";
import {
  DrawerMenu,
  DrawerMenuLabel,
  FormCheckbox,
  FormDocumentation,
  FormField,
  FormSelect,
  FormTextarea,
  RecordFieldManager,
} from "@/lib/reusable-comps";
import { shallowEqual } from "@/lib/utils";
import { Field, Input, Marking } from "@/lib/gens/data-types/codegen-types";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  isGlobalProjection: state.isGlobalProjection,
});

/**
 * Renders a controlled form section for configuring an input value.
 *
 * @param input - the current input configuration object (of type {@link Input `Input`}). The component
 * reads `input.type` to determine which controls to show and to set the value of the select.
 * @param setInput - state setter for the input object (`React.Dispatch<React.SetStateAction<Input>>`).
 *   Used to update the input object when the type select changes or when nested managers update it.
 * @param recordField - the currently selected/edited record field (of type {@link Field `Field`}). Passed
 *   through to the {@link RecordFieldManager `RecordFieldManager`} when editing record-type inputs.
 * @param setRecordField - state setter for the recordField (`React.Dispatch<React.SetStateAction<Field>>`).
 *   Used to update the {@link recordField `recordField`} state from the {@link RecordFieldManager `RecordFieldManager`}.
 * @param disabled - when true, all interactive controls in this section are disabled/read-only.
 *
 * This component displays:
 * - A label for the input section.
 * - A select control to choose the input type (options derived from a shared {@link inputTypes `inputTypes`} list).
 * - When the selected input type is `"Record"`, a {@link RecordFieldManager `RecordFieldManager`} is rendered to manage nested
 *   record fields.
 *
 * @remarks
 * - This is a controlled component, so callers must provide and manage the input and {@link recordField `recordField`} state.
 * - The shapes of {@link Input `Input`} and {@link Field `Field`} are external to this component and should be documented
 *   where they are defined.
 *
 * @component
 * @returns a JSX Element containing the input configuration UI.
 */
const InputConfiguration = ({
  input,
  setInput,
  recordField,
  setRecordField,
  disabled,
}: {
  input: Input;
  setInput: React.Dispatch<React.SetStateAction<Input>>;
  recordField: Field;
  setRecordField: React.Dispatch<React.SetStateAction<Field>>;
  disabled: boolean;
}) => (
  <>
    {/* INPUT CONFIGURATION SECTION */}
    <div className="flex flex-col gap-4">
      <label className="col-span-3 flex justify-center font-bold">
        Input Values
      </label>

      {/* INPUT TYPE SELECT */}
      <FormField label="Type" newClassName={true} className="grid grid-cols-3">
        <FormSelect
          value={input.type}
          onChange={(e) =>
            setInput((prev) => ({ ...prev, type: e.target.value }))
          }
          options={inputTypes.map((type) => ({ value: type, label: type }))}
          className="col-span-1"
          disabled={disabled}
        />
      </FormField>

      {/* RECORD FIELD MANAGER */}
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
  </>
);

/**
 * Renders a compact UI for editing a node's computation expression.
 *
 * @param expression - The current computation expression text to display in the `textarea`.
 * @param setExpression - State setter callback invoked with the new expression when the `textarea` value changes.
 * @param disabled - If true, disables user interaction with the `textarea`.
 *
 * This controlled component displays a centered section label ("Computation Expression")
 * and a monospace `textarea` bound to the provided {@link expression `expression`} value. User edits are
 * propagated via the {@link setExpression `setExpression`} callback. When {@link disabled `disabled`} is true the `textarea`
 * is rendered in a read-only/disabled state.
 *
 * @remarks
 * - This component is purely presentational and performs no side effects other than calling {@link setExpression `setExpression`}.
 * - It is intended to be used in contexts where the parent manages the expression state (i.e., a controlled component).
 *
 * @component
 * @returns A JSX component containing a label and a controlled `textarea` for editing the computation expression.
 */
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

/**
 * Renders the properties panel for editing a node's metadata and behavioral settings.
 * This is a controlled presentational component: all values are received via props and any
 * user changes are propagated through the provided setter callbacks.
 *
 * The component displays and manages:
 * - Initiators and Receivers as comma-separated `textareas` which are converted to string arrays.
 *   The conversion capitalizes the first letter of each entry.
 * - Node type (input "i" or computation "c") via a select control.
 * - Label and Event name `textareas` (spaces replaced with underscores on change).
 * - Marking flags ("pending" and "included") as checkboxes toggling the provided marking state.
 * - Parent selection populated from the supplied nodes list (filters nodes of type "nest" or "subprocess"),
 *   plus a "-" option representing no parent.
 * - Security label as a `textarea`.
 * - If the node is an input (`type === "i"`), renders the {@link InputConfiguration `InputConfiguration`} section allowing selection of
 *   input type and nested record field management. Otherwise renders a computation expression `textarea`.
 *
 * The component respects the `disabled` prop: when true all interactive controls are rendered read-only/disabled.
 *
 * @param initiators - current initiators array displayed and edited as a comma-separated `textarea`.
 * @param setInitiators - setter to update the initiators array.
 * @param receivers - current receivers array displayed and edited as a comma-separated `textarea`.
 * @param setReceivers - setter to update the receivers array.
 * @param type - current node type string (expected "i" for input or "c" for computation).
 * @param setType - setter to update the node type.
 * @param label - current display label for the node.
 * @param setLabel - setter to update the node label.
 * @param name - current event name for the node.
 * @param setName - setter to update the event name.
 * @param marking - current marking object of type {@link Marking `Marking`}.
 * @param setMarking - setter to update the marking object.
 * @param parent - current parent node id (empty string for no parent).
 * @param setParent - setter to update the parent id.
 * @param security - current security label for the node.
 * @param setSecurity - setter to update the security label.
 * @param input - current input configuration for input nodes (of type {@link Input `Input`}).
 * @param setInput - setter to update the input configuration.
 * @param expression - current computation expression string (used when `type !== "i"`).
 * @param setExpression - setter to update the computation expression.
 * @param recordField - current record field being edited (used by {@link RecordFieldManager `RecordFieldManager`} when `input.type === "Record"`).
 * @param setRecordField - setter to update the record field state.
 * @param nodes - array of all nodes in the editor; used to build the Parent select options.
 * @param disabled - when true, disables all interactive controls making the panel read-only.
 *
 * @remarks
 * - The component intentionally performs small, deterministic transformations on input:
 *   - Comma-separated text in initiators/receivers is split into array items and each item is capitalized.
 *   - Spaces in label and name are replaced with underscores on input.
 * - Parent options are derived from the `nodes` prop and include an explicit empty/`-` option.
 * - The component does not perform side effects like persisting changes itself; it relies on the parent
 *   to react to prop setter calls and persist updates as needed.
 *
 * @component
 * @returns a JSX Element that renders the node properties UI.
 */
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
  marking: Marking;
  setMarking: React.Dispatch<React.SetStateAction<Marking>>;
  parent: string;
  setParent: React.Dispatch<React.SetStateAction<string>>;
  security: string;
  setSecurity: React.Dispatch<React.SetStateAction<string>>;
  input: Input;
  setInput: React.Dispatch<React.SetStateAction<Input>>;
  expression: string;
  setExpression: React.Dispatch<React.SetStateAction<string>>;
  recordField: Field;
  setRecordField: React.Dispatch<React.SetStateAction<Field>>;
  nodes: Node[];
  disabled: boolean;
}) => {
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
    <div className="flex flex-col p-3 gap-2 overflow-y-auto h-full">
      {/* BASIC PROPERTIES */}
      <FormField label="Initiators">
        <FormTextarea
          value={initiators.join(", ")}
          onChange={(e) => handleArrayChange(e.target.value, setInitiators)}
          placeholder="Initiators"
          required
          disabled={disabled}
        />
      </FormField>

      {/* RECEIVERS FIELD */}
      <FormField label="Receivers">
        <FormTextarea
          value={receivers.join(", ")}
          onChange={(e) => handleArrayChange(e.target.value, setReceivers)}
          placeholder="Receivers"
          disabled={disabled}
        />
      </FormField>

      {/* TYPE FIELD */}
      <FormField label="Type">
        <FormSelect
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
          disabled={disabled}
        />
      </FormField>

      {/* LABEL FIELD */}
      <FormField label="Label">
        <FormTextarea
          value={label}
          onChange={(e) => setLabel(e.target.value.replace(" ", "_"))}
          placeholder="Event label"
          required
          disabled={disabled}
        />
      </FormField>

      {/* NAME FIELD */}
      <FormField label="Event">
        <FormTextarea
          value={name}
          onChange={(e) => setName(e.target.value.replace(" ", "_"))}
          placeholder="Event name"
          required
          disabled={disabled}
        />
      </FormField>

      {/* MARKING SECTION */}
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

      {/* PARENT SELECT */}
      <FormField label="Parent">
        <FormSelect
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          options={parentOptions}
          disabled={disabled}
        />
      </FormField>

      {/* SECURITY FIELD */}
      <FormField label="Security">
        <FormTextarea
          value={security}
          onChange={(e) => setSecurity(e.target.value)}
          placeholder="Security label"
          required
          disabled={disabled}
        />
      </FormField>

      {/* INPUT CONFIGURATION */}
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
 * Renders the properties editor for a single flow editor node and synchronizes edits
 * back to the global store when the current projection is "global".
 *
 * The component manages a local, controlled form state derived from the provided node's data
 * (initiators, receivers, type, label, name, marking, parent, security, input/expression).
 * When running in the global choreography it diffs the local state against the store and debounced
 * updates the store via {@link updateNode `updateNode`} to avoid rapid UI flashing. When not in the global choreography
 * the form is rendered in a read-only/disabled mode.
 *
 * @param node the Node instance (from ReactFlow) to display/edit. The node's data shape is
 * expected to include fields like initiators, receivers, type, label, name, marking,
 * input (for input nodes) or expression (for computation nodes), and security.
 *
 * @see {@link inputTypes `inputTypes`} for the list of valid input types for the record typed input events.
 *
 * Behavior / responsibilities:
 * - Initializes local state from `node.data` and `node.parentId`.
 * - Renders documentation editing ({@link FormDocumentation `FormDocumentation`}) only for global projection.
 * - Renders a comprehensive properties panel ({@link NodeProperties `NodeProperties`}) that includes:
 *   - Initiators and Receivers (as comma-separated `textarea` -> `string[]`),
 *   - Node type (input vs computation),
 *   - Label and Event name (spaces replaced with underscores on edit),
 *   - Marking checkboxes (pending, included),
 *   - Parent selection (populated by nodes of type "nest" or "subprocess" plus a "-" option),
 *   - Security label,
 *   - Input configuration for input nodes or computation expression otherwise.
 * - When in global choreography, computes a new data object and:
 *   - Uses {@link shallowEqual `shallowEqual`} to avoid store writes when nothing changed.
 *   - Debounces calls to {@link updateNode `updateNode`} (10ms) and sets parent-related flags
 *     (`parentId`, `expandParent`, `extent: "parent"`) when a parent is selected.
 *   - Cleans up the debounce timer on unmount to prevent leaks.
 *
 * Implementation notes:
 * - Reads required store selectors: {@link nodes `nodes`}, {@link updateNode `updateNode`}, {@link documentation `documentation`}, {@link addDocumentation `addDocumentation`}, {@link currentProjection `currentProjection`}.
 * - Uses a ref ({@link debounceTimeout `debounceTimeout`}) for debouncing the update effect.
 * - The component is purely presentational with respect to persisting changes; persistence is
 *   accomplished by calling {@link updateNode `updateNode`} provided by the external store.
 *
 * @returns a JSX element containing the drawer menu UI for editing the supplied node.
 */
const NodeMenu = ({ node }: { node: Node }) => {
  const {
    nodes,
    updateNode,
    documentation,
    addDocumentation,
    isGlobalProjection,
  } = useStore(selector, shallow);
  const { id, data, parentId } = node;

  const [initiators, setInitiators] = useState(data.initiators as string[]);
  const [receivers, setReceivers] = useState(
    data.receivers ? (data.receivers as string[]) : [""]
  );
  const [type, setType] = useState(data.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [name, setName] = useState(data.name as string);
  const [marking, setMarking] = useState(data.marking as Marking);
  const [parent, setParent] = useState(parentId as string);
  const [security, setSecurity] = useState(data.security as string);
  const [input, setInput] = useState(data.input as Input);
  const [expression, setExpression] = useState(
    data.expression ? (data.expression as string) : ""
  );
  const [recordField, setRecordField] = useState<Field>({
    var: "",
    type: inputTypes[0],
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isGlobalProjection()) return;

    const storeNode = nodes.find((n) => n.id === id);
    if (!storeNode) return;

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

    if (shallowEqual(storeNode.data, newData) && storeNode.parentId === parent)
      return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      updateNode(id, {
        ...storeNode,
        data: newData,
        ...(parent
          ? {
              parentId: parent,
              expandParent: true,
              extent: "parent",
            }
          : { parentId: "" }),
      });
    }, 10);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [
    initiators,
    receivers,
    type,
    label,
    name,
    marking,
    parent,
    security,
    input,
    expression,
    isGlobalProjection,
    id,
    nodes,
  ]);
  /* 
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
  }; */

  return (
    <DrawerMenu>
      {/* DRAWER NODE MENU */}
      <DrawerMenuLabel>
        <SquareMousePointer size={40} />
        Node {id}
      </DrawerMenuLabel>

      {/* DOCUMENTATION */}
      {isGlobalProjection() && (
        <FormDocumentation
          documentation={documentation.get(id)}
          onChange={(e) => addDocumentation(id, e.target.value)}
          key={id}
        />
      )}

      {/* NODE PROPERTIES */}
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
        disabled={!isGlobalProjection()}
      />
    </DrawerMenu>
  );
};

export default NodeMenu;
