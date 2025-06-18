import { useState } from "react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { SquareMousePointer } from "lucide-react";

import { Node } from "@xyflow/react";
import {
  FieldType,
  InputType,
  inputTypes,
  MarkingType,
  simpleInputTypes,
} from "@/lib/codegen";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  updateNode: state.updateNode,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
});

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
  const { nodes, updateNode, documentation, addDocumentation } = useStore(
    selector,
    shallow
  );
  const { id, data, parentId } = node;

  const [initiators, setInitiators] = useState(data.initiators as string[]);
  const [receivers, setReceivers] = useState(data.receivers as string[]);
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

  return (
    <div className="flex flex-col mr-4 gap-1 h-[94vh] w-[calc(100%-6px)] overflow-y-auto select-none">
      {/* NODE WITH RESPECTIVE ID */}
      <div className="flex items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <SquareMousePointer size={40} />
        Node {id}
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
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC] overflow-y-auto h-full">
        {/* INITIATORS */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Initiators</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={(initiators as string[]).join(", ")}
            placeholder="Initiators"
            onChange={(event) =>
              setInitiators(
                event.target.value
                  .split(", ")
                  .map((val) => val.charAt(0).toUpperCase() + val.slice(1))
              )
            }
          />
        </div>

        {/* RECEIVERS */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Receivers</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={(receivers as string[]).join(", ")}
            placeholder="Receivers"
            onChange={(event) =>
              setReceivers(
                event.target.value
                  .split(", ")
                  .map((val) => val.charAt(0).toUpperCase() + val.slice(1))
              )
            }
          />
        </div>

        {/* TYPE (I, C) */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Type</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={type as string}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="i">Input</option>
            <option value="c">Computation</option>
          </select>
        </div>

        {/* LABEL */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Label</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            placeholder="Event label"
            value={label as string}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        {/* NAME */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Event</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            placeholder="Event name"
            value={name as string}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        {/* MARKING (PENDING, INCLUDED) */}
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

        {/* PARENT */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Parent</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={parent as string}
            onChange={(event) => setParent(event.target.value)}
          >
            {nodes
              .filter((n) => n.type === "nest" || n.type === "subprocess")
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data.label as string}
                </option>
              ))}
            <option value={""}>-</option>
          </select>
        </div>

        {/* SECURITY */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Security</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            placeholder="Security label"
            value={security as string}
            onChange={(event) => {
              setSecurity(event.target.value);
            }}
          />
        </div>

        {type === "i" ? (
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="col-span-3 flex justify-center font-bold">
              Input Values
            </label>

            <label>Type</label>
            <select
              className="col-span-2 h-8 bg-white rounded-sm font-mono"
              value={input.type as string}
              onChange={(event) =>
                setInput((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              {inputTypes.map((type, index) => (
                <option key={index} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {(input.type as string) === "Record" && (
              <>
                <label className=" col-span-3 flex justify-center font-bold text-sm">
                  Record Fields
                </label>
                <label>Label</label>
                <input
                  className="col-span-2 h-8 bg-white rounded-sm font-mono px-1"
                  value={recordField.var}
                  placeholder="Field Name"
                  onChange={(event) =>
                    setRecordField((prev) => ({
                      ...prev,
                      var: event.target.value,
                    }))
                  }
                />
                <label>Type</label>
                <select
                  className="col-span-2 h-8 bg-white rounded-sm font-mono"
                  value={recordField.type}
                  onChange={(event) =>
                    setRecordField((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                >
                  {simpleInputTypes.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  className="bg-black h-8 col-span-3 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
                  onClick={() => {
                    if (recordField && input.type === "Record") {
                      setInput((prev) => {
                        const recordInput = prev as {
                          type: "Record";
                          record: FieldType[];
                        };
                        return {
                          ...recordInput,
                          record: [...(recordInput.record ?? []), recordField],
                        };
                      });
                      setRecordField({ var: "", type: inputTypes[0] });
                    }
                  }}
                >
                  Add Field
                </button>
                {"record" in input ? (
                  input.record.map((field, index) => (
                    <div
                      key={index}
                      className="col-span-3 flex justify-between items-center"
                    >
                      <label className="font-mono">
                        {field.var}: {field.type}
                      </label>
                      <button
                        className="bg-red-500 h-8 w-8 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
                        onClick={() => {
                          setInput((prev) => {
                            const recordInput = prev as {
                              type: "Record";
                              record: FieldType[];
                            };
                            return {
                              ...recordInput,
                              record: recordInput.record.filter(
                                (_, i) => i !== index
                              ),
                            };
                          });
                        }}
                      >
                        X
                      </button>
                    </div>
                  ))
                ) : (
                  <></>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <label className="col-span-3 flex justify-center font-bold">
              Computation Expression
            </label>
            <textarea
              className="col-span-3 min-h-24 max-h-72 h-24 bg-white rounded-sm p-1 font-mono"
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
            ></textarea>
          </>
        )}
      </div>
      {/* SAVE CHANGES BUTTON */}
      <div className="flex justify-center m-2">
        <button
          className="bg-black min-h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          type="button"
          onClick={() =>
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
            })
          }
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default NodeMenu;
