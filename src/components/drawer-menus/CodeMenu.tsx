import { writeCode } from "@/lib/codegen";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import Editor from "@monaco-editor/react";
import { delay, getLayoutedElements } from "@/lib/utils";

import { Edge, Node } from "@xyflow/react";
import { visualGen } from "@/lib/visualgen";

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
  eventRef: { value: string }; // e.g., "_@eventName"
}

interface PropBasedExprSimple {
  propBasedExpr: PropBasedExpr;
  prop: string;
}

interface PropBasedExprComplex {
  propDeref: {
    propBasedExpr: PropBasedExpr;
    prop: string;
  };
}

type PropBasedExpr = PropBasedExprSimple | PropBasedExprComplex | EventRef;

interface BinaryOp {
  expr1: Expression;
  expr2: Expression;
  op: BoolOperation;
}

type Value =
  | { intLit: { value: number } }
  | { stringLit: { value: string } }
  | { boolLit: { value: boolean } }
  | { floatLit: { value: number } }
  | PropBasedExpr;

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

interface RoleExprSimple {
  roleLabel: string;
  params: Param[];
}

interface RoleExprComplex {
  roleExpr: {
    roleLabel: string;
    params: Param[];
  };
}

interface InitiatorExpr {
  initiatorExpr: {
    eventId: string;
  };
}

interface ReceiverExpr {
  receiverExpr: {
    eventId: string;
  };
}

type RoleExpr = RoleExprSimple | RoleExprComplex | InitiatorExpr | ReceiverExpr;

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
  console.log(roleExpr);
  let roleLabel, params;
  if ("initiatorExpr" in roleExpr)
    return `@Initiator(${roleExpr.initiatorExpr.eventId})`;
  else if ("receiverExpr" in roleExpr)
    return `@Receiver(${roleExpr.receiverExpr.eventId})`;
  else if ("roleExpr" in roleExpr) {
    roleLabel = roleExpr.roleExpr.roleLabel;
    params = roleExpr.roleExpr.params;
  } else {
    roleLabel = roleExpr.roleLabel;
    params = roleExpr.params;
  }
  const paramsString = params.map((param) => {
    const { name, value } = param;
    console.log(param);
    if (value) {
      if ("propDeref" in value)
        return `${name}=${processPropDeref(value.propDeref)}`;
      else if ("intLit" in value) return `${name}=${value.intLit.value}`;
      else if ("stringLit" in value)
        return `${name}='${value.stringLit.value}'`;
      else if ("boolLit" in value) return `${name}=${value.boolLit.value}`;
      else if ("floatLit" in value) return `${name}=${value.floatLit.value}`;
    } else return `${name}=*`;
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
  if ("eventRef" in propDeref) return propDeref.eventRef.value;

  let propBasedExpr, prop;
  if ("propDeref" in propDeref) {
    propBasedExpr = propDeref.propDeref.propBasedExpr;
    prop = propDeref.propDeref.prop;
  } else {
    propBasedExpr = propDeref.propBasedExpr;
    prop = propDeref.prop;
  }

  const base = processPropDeref(propBasedExpr);

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

function processInitRecv(
  first: Role,
  second: RoleExpr[],
  instantiationConstraint?: Expression
) {
  const secondMapped = second.map((sec) => processRoleExpr(sec));
  const hasParam = first.params.map((param) => {
    if (secondMapped.some((sec) => sec.includes(`params.${param.name}`)))
      return `#${param.name} as X`;
    else return `#${param.name}`;
  });
  let firstMapped = first.label + "(x)";
  if (instantiationConstraint) {
    const insCons = processDataExpr(instantiationConstraint).split(" && ");
    const newParams = first.params.map((param, index) => {
      let part: string = "";
      insCons.forEach((cons) => {
        const consSplitted = cons.split(" ");
        if (consSplitted[0].includes(param.name)) {
          if (consSplitted[1] === "==")
            part = `${param.name}=${consSplitted[2]}`;
          else part = hasParam[index];
        }
      });
      return part;
    });
    firstMapped = `${first.label}(${newParams.join("; ")})`;
  } else firstMapped = `${first.label}(${hasParam.join("; ")})`;

  return { first: firstMapped, collection: secondMapped };
}

function processChoregraphyGraphChildren(graph: ChoreographyGraph) {
  const { events, relations } = graph;

  let length = 0;
  if (events) length += events.length;
  if (relations) {
    relations.forEach((relation) => {
      if ("spawnRelation" in relation)
        length += processChoregraphyGraphChildren(relation.spawnRelation.graph);
    });
  }

  return length;
}

function processChoreographyGraph(
  role: Role,
  graph: ChoreographyGraph,
  graphId: number
) {
  const { events, relations } = graph;

  let subprocessId = 0;
  let nextGraphId = graphId;
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
              instantiationConstraint,
            } = common;

            const { first: inits, collection: recvs } = processInitRecv(
              role,
              receivers,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [inits],
                receivers: recvs,
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                interactionType: "tx",
              },
              zIndex: 10000,
            };
          } else if ("receiveEvent" in event) {
            const { common, initiators } = event.receiveEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
              instantiationConstraint,
            } = common;

            const { first: recvs, collection: inits } = processInitRecv(
              role,
              initiators,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [recvs],
                receivers: inits,
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                interactionType: "rx",
              },
              zIndex: 10000,
            };
          } else {
            const { common, dataExpr, receivers } = event.computationEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
              instantiationConstraint,
            } = common;

            const { first: inits, collection: recvs } = processInitRecv(
              role,
              receivers,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [inits],
                receivers: recvs,
                type: "c",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                expression: processDataExpr(dataExpr),
                interactionType: "tx",
              },
              zIndex: 10000,
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
        const { sourceId: source } = relationCommon;

        edges.push({
          id: `${type.charAt(0)}-${source}-${target}`,
          source,
          target,
          type,
          data: {
            guard: "",
          },
          zIndex: 20000,
        });
      } else {
        const { relationCommon, graph } = relation.spawnRelation;
        const { sourceId: source } = relationCommon;
        const { nodes: spawnNodes, edges: spawnEdges } =
          processChoreographyGraph(role, graph, ++graphId);

        const subId = `s${subprocessId++}-${graphId}`;
        const childrenLength = processChoregraphyGraphChildren(graph);
        const subprocess: Node = {
          id: subId,
          position: { x: 0, y: 0 },
          width: childrenLength * 150,
          height: childrenLength * 150,
          type: "subprocess",
          parentId: "",
          data: {
            label: subId,
            marking: {
              included: true,
              pending: false,
            },
          },
          zIndex: 1000,
        };
        nodes = [
          ...nodes,
          subprocess,
          ...spawnNodes.map((nd) => ({
            ...nd,
            parentId: nd.parentId ? nd.parentId : subprocess.id,
            expandParent: true,
            extent: "parent" as const,
          })),
        ];
        edges = [
          ...edges,
          {
            id: `s-${source}-${subId}`,
            source,
            target: subprocess.id,
            type: "spawn",
            data: {
              guard: "",
            },
            zIndex: 20000,
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
  const { nodes, edges } = processChoreographyGraph(role, graph, 0);
  console.log(nodes, edges);
  return { nodes, edges };
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
  projectionInfo: state.projectionInfo,
  setProjectionInfo: state.setProjectionInfo,
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
    projectionInfo,
    setProjectionInfo,
  } = useStore(selector, shallow);

  const compileCode = () => {
    if (code) {
      let projections: ChoreographyModel[] = [];
      const fetchFun = async () => {
        fetch("/api/code", {
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

        const response = await fetch("/api/projections");
        projections = await response.json();

        projections.forEach((proj) => {
          if (proj.graph.events && proj.graph.relations) {
            const result = processChoregraphyModel(proj);
            const layoutedResult = getLayoutedElements(
              result.nodes,
              result.edges
            );
            setProjectionInfo(proj.role.label, layoutedResult);
          }
        });
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
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2 select-none"
      style={{ height: "calc(100vh - 50px)" }}
    >
      <Editor
        className="w-full h-[520px]"
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
            const { eventMap, code: newCode } = writeCode(
              nodes,
              edges,
              rolesParticipants,
              security
            );
            setEventMap(eventMap);
            setCode(newCode);
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

        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) downloadCode();
          }}
        >
          Download Code
        </button>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={() => {
            if (code) {
              const { nodes: newNodes, edges: newEdges } = visualGen(code);
              const { nodes: layoutedNodes, edges: layoutedEdges } =
                getLayoutedElements(newNodes, newEdges);

              setNodes(layoutedNodes);
              setEdges(layoutedEdges);
            }
          }}
        >
          Generate Graph
        </button>
      </div>
    </div>
  );
}
