import { useState } from "react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { SquareMousePointer } from "lucide-react";

import { Node } from "@xyflow/react";
import { InputType, MarkingType } from "@/lib/codegen";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  setSelectedElement: state.setSelectedElement,
  updateNode: state.updateNode,
});

const simpleInputTypes = ["Integer", "String", "Boolean"];

const inputTypes = [...simpleInputTypes, "Record", "Unit"]; // "Reference" type not considered yet

/**
 * Component that shows the selected node properties.
 * @returns the node menu component.
 */
export const NodeMenu = ({ node }: { node: Node }) => {
  const { nodes, setSelectedElement, updateNode } = useStore(selector, shallow);
  const { id, data, parentId } = node;

  const marking = data.marking as MarkingType;

  const [initiators, setInitiators] = useState(data.initiators as string[]);
  const [receivers, setReceivers] = useState(data.receivers as string[]);
  const [type, setType] = useState(data.type as string);
  const [label, setLabel] = useState(data.label as string);
  const [name, setName] = useState(data.name as string);
  const [included, setIncluded] = useState(marking.included as boolean);
  const [pending, setPending] = useState(marking.pending as boolean);
  const [parent, setParent] = useState(parentId as string);
  const [security, setSecurity] = useState(data.security as string);
  const [input, setInput] = useState(data.input as InputType);
  const [recordField, setRecordField] = useState({
    var: "",
    type: inputTypes[0],
  });
  const [expression, setExpression] = useState(
    (data.expression as string) ?? ""
  );

  const newData = {
    ...data,
    initiators,
    receivers,
    type,
    label,
    name,
    marking: {
      included,
      pending,
    },
    ...(type === "i" ? { input } : { expression }),
    security,
  };

  return (
    <div className="flex flex-col mr-4 gap-1 h-[94vh] w-[calc(100%-6px)] overflow-y-auto">
      {/* NODE WITH RESPECTIVE ID */}
      <div className="flex items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <SquareMousePointer size={40} />
        Node {id}
      </div>

      {/* DOCUMENTATION OF NODE */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC]">
        <div className="font-bold text-[16px]">Documentation</div>
        <textarea className="bg-white rounded-sm min-h-10 max-h-64 p-1" />
      </div>

      {/* NODE PROPERTIES */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC] overflow-y-auto h-full">
        {/* INITIATORS */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Initiators</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={(initiators as string[]).join(", ")}
            onChange={(event) => {
              const val = event.target.value;

              setInitiators(
                val
                  .split(", ")
                  .map((val) => val.charAt(0).toUpperCase() + val.slice(1))
              );
            }}
          />
        </div>

        {/* RECEIVERS */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Receivers</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={(receivers as string[]).join(", ")}
            onChange={(event) => {
              const val = event.target.value;

              setReceivers(
                val
                  .split(", ")
                  .map((val) => val.charAt(0).toUpperCase() + val.slice(1))
              );
            }}
          />
        </div>

        {/* TYPE (I, C) */}
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
            <option value="i">Input</option>
            <option value="c">Computation</option>
          </select>
        </div>

        {/* LABEL */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Label</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={label as string}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
          />
        </div>

        {/* NAME */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Event</label>
          <textarea
            className="col-span-2 min-h-8 h-8 bg-white rounded-sm p-1 font-mono"
            value={name as string}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </div>

        {/* MARKING (PENDING, INCLUDED) */}
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

        {/* PARENT */}
        <div className="grid grid-cols-3 items-center gap-4">
          <label>Parent</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={parent as string}
            onChange={(event) => {
              const value = event.target.value;
              console.log(value);
              setParent(value);
            }}
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
              onChange={(event) => {
                const value = event.target.value;
                setInput((prev) => ({ ...prev, type: value }));
              }}
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
                  onChange={(event) => {
                    const value = event.target.value;
                    setRecordField((prev) => ({ ...prev, var: value }));
                  }}
                />
                <label>Type</label>
                <select
                  className="col-span-2 h-8 bg-white rounded-sm font-mono"
                  value={recordField.type}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRecordField((prev) => ({ ...prev, type: value }));
                  }}
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
                          record: { var: string; type: string }[];
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
                {(input as { type: "Record"; record: any[] }).record ? (
                  (input as { type: "Record"; record: any[] }).record.map(
                    (field, index) => (
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
                                record: { var: string; type: string }[];
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
                    )
                  )
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
              onChange={(event) => {
                const value = event.target.value;
                setExpression(value);
              }}
            ></textarea>
          </>
        )}
      </div>
      {/* SAVE CHANGES BUTTON */}
      <div className="flex justify-center m-2">
        <button
          className="bg-black min-h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          type="button"
          onClick={() => {
            const newNode: Node = {
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
            };
            updateNode(id, newNode);
            setSelectedElement(newNode);
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};
