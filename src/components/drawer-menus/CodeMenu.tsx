import { writeCode } from "@/lib/codegen";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import Editor from "@monaco-editor/react";
import { delay } from "@/lib/utils";

import { Edge, Node } from "@xyflow/react";
import { stringify } from "querystring";

type BasicType = "array" | "int" | "string" | "bool" | "void" | "float";
type EventRelation =
  | "condition"
  | "response"
  | "include"
  | "exclude"
  | "milestone";
type BoolOperation =
  | "equals"
  | "and"
  | "notEquals"
  | "or"
  | "intGreaterThan"
  | "intLessThan"
  | "intAdd";

// Tipos Básicos
type ValueType = BasicType | { recordType: { fields: Field[] } };

interface Field {
  name: string;
  type: { valueType: ValueType };
}

interface Param {
  name: string;
  type?: { valueType: ValueType }; // usado em role
  value?: Value; // usado em instâncias
}

interface Role {
  label: string;
  params: Param[];
}

interface EventRef {
  value: string; // e.g., "_@self"
}

interface PropBasedExpr {
  propDeref: {
    propBasedExpr: PropBasedExpr | EventRef;
    prop: string;
  };
}

interface BinaryOp {
  expr1: Expression;
  expr2: Expression;
  op: BoolOperation;
}

type Value =
  | { intLit: { value: number } }
  | { stringLit: { value: string } }
  | { boolLit: { value: boolean } }
  | { floatLit: { value: number } };

type Expression = { binaryOp: BinaryOp } | { propDeref: PropBasedExpr } | Value;

type DataType = { valueType: ValueType } | { recordType: { fields: Field[] } };

// Eventos Comuns
interface CommonEventData {
  endpointElementUID: string;
  choreoElementUID: string;
  id: string;
  label: string;
  dataType: DataType;
  marking: { isPending: boolean; isIncluded: boolean };
  instantiationConstraint?: Expression;
  ifcConstraint?: Expression;
}

interface ComputationEvent {
  computationEvent: {
    common: CommonEventData;
    dataExpr: Expression;
    receivers: RoleExpr[];
  };
}

// Eventos
interface InputEvent {
  inputEvent: {
    common: CommonEventData;
    receivers: RoleExpr[];
  };
}

interface ReceiveEvent {
  receiveEvent: {
    common: CommonEventData;
    initiators: RoleExpr[];
  };
}

type Event = InputEvent | ReceiveEvent | ComputationEvent;

interface RoleExpr {
  roleExpr: {
    roleLabel: string;
    params: Param[];
  };
}

// Relações
interface ControlFlowRelation {
  controlFlowRelation: {
    relationCommon: {
      endpointElementUID: string;
      sourceId: string;
      instantiationConstraint?: Expression;
    };
    targetId: string;
    relationType: EventRelation;
  };
}

interface SpawnRelation {
  spawnRelation: {
    relationCommon: {
      endpointElementUID: string;
      sourceId: string;
      instantiationConstraint: Expression;
    };
    triggerId: string;
    graph: ChoreographyGraph;
  };
}

type Relation = ControlFlowRelation | SpawnRelation;

interface ChoreographyGraph {
  events: Event[];
  relations: Relation[];
}

interface ChoreographyModel {
  role: Role;
  graph: ChoreographyGraph;
}

function processRoleExpr(roleExpr: RoleExpr): string {
  const { roleLabel, params } = roleExpr.roleExpr;
  const paramsString = params.map((param) => {
    const { name, value } = param;
    if (value) {
      if ("intLit" in value) return `${name}=${value.intLit.value}`;
      else if ("stringLit" in value)
        return `${name}='${value.stringLit.value}'`;
      else if ("boolLit" in value) return `${name}=${value.boolLit.value}`;
      else if ("floatLit" in value) return `${name}=${value.floatLit.value}`;
    }
  });

  return `${roleLabel}(${paramsString.join("; ")})`;
}

function processDataType(dataType: DataType) {
  if ("valueType" in dataType) {
    switch (dataType.valueType) {
      case "int":
        return { input: { type: "Integer" } };
      case "string":
        return { input: { type: "String" } };
      case "void":
        return { input: { type: "Unit" } };
      case "bool":
        return { input: { type: "Boolean" } };
      case "float":
        return { input: { type: "Float" } };
      case "array":
        return { input: { type: "Array" } };
    }
  } else {
    const fields = dataType.recordType.fields.map((field) => {
      switch (field.type.valueType) {
        case "int":
          return { var: field.name, type: "Integer" };
        case "string":
          return { var: field.name, type: "String" };
        case "bool":
          return { var: field.name, type: "Boolean" };
        case "float":
          return { var: field.name, type: "Float" };
        case "array":
          return { var: field.name, type: "Array" };
      }
    });
    return { input: { type: "Record", record: fields } };
  }
}

function processPropDeref(propDeref: PropBasedExpr): string {
  const { propBasedExpr, prop } = propDeref.propDeref;
  let base: string = "";

  if ("propDeref" in propBasedExpr) base = processPropDeref(propBasedExpr);
  else base = propBasedExpr.value;

  return `${base}.${prop}`;
}

function processBinaryOp(binaryOp: BinaryOp): string {
  const { expr1, expr2, op } = binaryOp;
  let left: string = "";
  let right: string = "";

  if (expr1) {
    if ("propDeref" in expr1) left = processPropDeref(expr1.propDeref);
    else if ("binaryOp" in expr1) left = processBinaryOp(expr1.binaryOp);
    else if ("intLit" in expr1) left = expr1.intLit.value.toString();
    else if ("stringLit" in expr1) left = `'${expr1.stringLit.value}'`;
    else if ("boolLit" in expr1) left = expr1.boolLit.value.toString();
    else if ("floatLit" in expr1) left = expr1.floatLit.value.toString();
  }

  if (expr2) {
    if ("propDeref" in expr2) right = processPropDeref(expr2.propDeref);
    else if ("binaryOp" in expr2) right = processBinaryOp(expr2.binaryOp);
    else if ("intLit" in expr2) right = expr2.intLit.value.toString();
    else if ("stringLit" in expr2) right = `'${expr2.stringLit.value}'`;
    else if ("boolLit" in expr2) right = expr2.boolLit.value.toString();
    else if ("floatLit" in expr2) right = expr2.floatLit.value.toString();
  }

  switch (op) {
    case "and":
      return `${left} && ${right}`;
    case "or":
      return `${left} || ${right}`;
    case "equals":
      return `${left} == ${right}`;
    case "notEquals":
      return `${left} != ${right}`;
    case "intGreaterThan":
      return `${left} > ${right}`;
    case "intLessThan":
      return `${left} < ${right}`;
    case "intAdd":
      return `${left} + ${right}`;
    default:
      return `${left} ${op} ${right}`;
  }
}

function processDataExpr(dataExpr: Expression): string {
  if ("binaryOp" in dataExpr) return processBinaryOp(dataExpr.binaryOp);
  else if ("propDeref" in dataExpr) return processPropDeref(dataExpr.propDeref);
  else if ("intLit" in dataExpr) return dataExpr.intLit.value.toString();
  else if ("stringLit" in dataExpr) return `'${dataExpr.stringLit.value}'`;
  else if ("boolLit" in dataExpr) return dataExpr.boolLit.value.toString();
  else if ("floatLit" in dataExpr) return dataExpr.floatLit.value.toString();
  return "";
}

function processChoreographyGraph(role: Role, graph: ChoreographyGraph) {
  const { events, relations } = graph;

  console.log(events, relations);

  let nodes: Node[] =
    events && events.length > 0
      ? events.map((event) => {
          if ("inputEvent" in event) {
            const { common, receivers } = event.inputEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
            } = common;

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [role.label + "(x)"],
                receivers: receivers.map((recv) => processRoleExpr(recv)),
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                input: processDataType(dataType),
              },
            };
          } else if ("receiveEvent" in event) {
            const { common, initiators } = event.receiveEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
            } = common;

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [role.label + "(x)"],
                receivers: initiators.map((init) => processRoleExpr(init)),
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                input: processDataType(dataType),
              },
            };
          } else {
            const { common, dataExpr, receivers } = event.computationEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
            } = common;

            console.log(dataExpr);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [role.label + "(x)"],
                receivers: receivers.map((recv) => processRoleExpr(recv)),
                type: "c",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                input: processDataType(dataType),
                expression: processDataExpr(dataExpr),
              },
            };
          }
        })
      : [];

  let edges: Edge[] = [];
  if (relations) {
    relations.forEach((relation) => {
      if ("controlFlowRelation" in relation) {
        const {
          relationCommon,
          relationType: type,
          targetId: target,
        } = relation.controlFlowRelation;
        const { endpointElementUID: id, sourceId: source } = relationCommon;

        edges.push({
          id,
          source,
          target,
          type,
          data: {
            guard: "",
          },
        });
      } else {
        const { relationCommon, triggerId, graph } = relation.spawnRelation;
        const { endpointElementUID: id, sourceId: source } = relationCommon;
        const { nodes: spawnNodes, edges: spawnEdges } =
          processChoreographyGraph(role, graph);

        const subprocess: Node = {
          id: triggerId,
          position: { x: 0, y: 0 },
          type: "subprocess",
          parentId: "",
          data: {
            label: triggerId,
            marking: {
              included: true,
              pending: false,
            },
          },
        };
        nodes = [
          ...nodes,
          subprocess,
          ...spawnNodes.map((nd) => ({
            ...nd,
            parentId: triggerId,
            expandParent: true,
          })),
        ];
        edges = [
          ...edges,
          {
            id,
            source,
            target: subprocess.id,
            type: "spawn",
            data: {
              guard: "",
            },
          },
          ...spawnEdges,
        ];
      }
    });
  }

  return { nodes, edges };
}

function processChoregraphyModel(choregraphy: ChoreographyModel) {
  const { role, graph } = choregraphy;
  const { nodes, edges } = processChoreographyGraph(role, graph);
  console.log(nodes, edges);
}

const selector = (state: RFState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
  edges: state.edges,
  setEdges: state.setEdges,
  rolesParticipants: state.rolesParticipants,
  security: state.security,
  code: state.code,
  setCode: state.setCode,
  eventMap: state.eventMap,
  setEventMap: state.setEventMap,
  updateNodeInfo: state.updateNodeInfo,
});

/**
 * `CodeMenu` is a React functional component that provides a code editor interface
 * for viewing, editing, generating, and downloading code within the application.
 *
 * Features:
 * - Displays a code editor (Monaco Editor) with Python-like syntax highlighting.
 * - Allows users to generate code based on the current application state (nodes, edges, roles, security).
 * - Enables users to download the current code as a `.txt` file.
 * - (Commented out) Option to save changes made in the editor back to the application's visual state.
 *
 * State Management:
 * - Utilizes a custom store via `useStore` to access and update code, event maps, and related data.
 *
 * UI:
 * - Responsive layout with labeled sections and styled buttons for user actions.
 *
 * @component
 * @returns {JSX.Element} The rendered CodeMenu component.
 */
export default function CodeMenu() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    rolesParticipants,
    security,
    code,
    setCode,
    setEventMap,
  } = useStore(selector, shallow);

  const compileCode = () => {
    if (code) {
      let projections: ChoreographyModel[] = [];
      const fetchFun = async () => {
        fetch("http://localhost:8080/code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
          }),
        })
          .then((res) => res.text())
          .then((data) => console.log(data));

        await delay(1000);

        const response = await fetch("http://localhost:8080/projections");
        projections = await response.json();

        let nodes: Node[] = [];
        let edges: Edge[] = [];

        projections.forEach((proj) => processChoregraphyModel(proj));
      };
      fetchFun();
    }
  };

  /**
   * Initiates a download of the current code as a plain text file named "regrada.txt".
   *
   * This function creates a Blob from the `code` variable, generates a temporary object URL,
   * and programmatically triggers a download by creating and clicking an anchor element.
   * After the download is triggered, the anchor is removed from the DOM and the object URL is revoked.
   */
  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "regrada.txt";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2"
      style={{ height: "calc(100vh - 50px)" }}
    >
      <label className="text-lg font-bold">Code</label>
      <Editor
        className="w-full h-[500px]"
        defaultLanguage="python"
        value={code}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          scrollBeyondLastLine: false,
        }}
        onChange={(newCode) => {
          if (newCode) setCode(newCode);
        }}
      />
      <div className="flex gap-2 w-full">
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            const { eventMap, code } = writeCode(
              nodes,
              edges,
              rolesParticipants,
              security
            );
            setEventMap(eventMap);
            setCode(code);
          }}
        >
          Generate Code
        </button>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={compileCode}
        >
          Compile
        </button>
        {/*
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) {
              const events = modifyRepresentation(code, eventMap);
              events.forEach((ev, id) => {
                updateNodeInfo(id, ev);
              });
            }
          }}
        >
          Save Changes
        </button>
        */}
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) downloadCode();
          }}
        >
          Download Code
        </button>
      </div>
    </div>
  );
}
