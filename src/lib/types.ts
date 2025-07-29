import { Edge, Node } from "@xyflow/react";
import { setState } from "./utils";

export const state = await setState();

export const initialState: {
  nodes: Node[];
  edges: Edge[];
  roles: SimpleRole[];
  security: string;
} = {
  nodes: [
    {
      id: "e0",
      type: "event",
      data: {
        initiators: ["P(id=1)"],
        receivers: [],
        type: "i",
        label: "e0",
        name: "readDocument",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Record",
          record: [
            { var: "size", type: "Integer" },
            { var: "name", type: "String" },
          ],
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 100, y: 100 },
      zIndex: 10000,
    },
    {
      id: "e1",
      type: "event",
      data: {
        initiators: ["P(id=1)"],
        receivers: ["P(id=2)"],
        type: "i",
        label: "e1",
        name: "submit",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Unit",
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 250, y: 100 },
      zIndex: 10000,
    },
    {
      id: "e2",
      type: "event",
      data: {
        initiators: ["P(id=2)"],
        receivers: ["P(id=1)"],
        type: "i",
        label: "e2",
        name: "accept",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Unit",
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 400, y: 100 },
      zIndex: 10000,
    },
  ],
  edges: [
    {
      id: "c-e0-e1",
      type: "condition",
      source: "e0",
      target: "e1",
      data: {
        guard: "",
      },
      zIndex: 20000,
    },
    {
      id: "r-e1-e2",
      type: "response",
      source: "e1",
      target: "e2",
      data: {
        guard: "",
      },
      zIndex: 20000,
    },
  ],
  roles: [
    {
      role: "Prosumer",
      label: "P",
      types: [{ var: "id", type: "Integer" }],
    },
    {
      role: "Public",
      label: "Public",
      types: [],
    },
  ],
  security: "Public flows P",
};

export const simpleInputTypes = ["Integer", "String", "Boolean"];
export const inputTypes = [...simpleInputTypes, "Record", "Unit"]; // "Reference" type not considered yet

export const relationsMap: { [rel: string]: string } = {
  condition: "-->*",
  response: "*-->",
  include: "-->+",
  exclude: "-->%",
  milestone: "--<>",
  spawn: "-->>",
};

export const eventRegex = /\(([^)]+)\) \(([^)]+)\) \[([^\]]+)\] \[([^\]]+)\]/;

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

type ValueType = BasicType | { recordType: { fields: Field[] } };

interface Field {
  name: string;
  type: { valueType: ValueType };
}

interface Param {
  name: string;
  type?: { valueType: ValueType };
  value?: Value;
}

export interface Role {
  label: string;
  params: Param[];
}

interface EventRef {
  eventRef: { value: string };
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

export type PropBasedExpr =
  | PropBasedExprSimple
  | PropBasedExprComplex
  | EventRef;

export interface BinaryOp {
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

export type Expression =
  | { binaryOp: BinaryOp }
  | { propDeref: PropBasedExpr }
  | Value;

export type DataType =
  | { valueType: ValueType }
  | { recordType: { fields: Field[] } };

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

export type RoleExpr =
  | RoleExprSimple
  | RoleExprComplex
  | InitiatorExpr
  | ReceiverExpr;

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

export interface ChoreographyGraph {
  events: Event[];
  relations: Relation[];
}

export interface ChoreographyModel {
  role: Role;
  graph: ChoreographyGraph;
}

export interface StackTraceElement {
  location?: {
    from: { line: number; column: number };
    to: { line: number; column: number };
  };
  message: string;
}

export interface CompileError {
  compileError: {
    stackTrace: StackTraceElement[];
  };
}

export type FieldType = { var: string; type: string };

export type InputType =
  | { type: string }
  | { type: "Record"; record: FieldType[] };

export type MarkingType = {
  included: boolean;
  pending: boolean;
};

export type SimulationMarkingType = MarkingType & {
  executable: boolean;
  executed: boolean;
  spawned?: boolean;
};

export type EventType = {
  id: string;
  label: string;
  name: string;
  security: string;
  input?: InputType;
  expression?: string;
  initiators: string[];
  receivers?: string[];
  marking: MarkingType;
  parent?: string;
};

export type SubprocessType = {
  id: string;
  label: string;
  marking: MarkingType;
  parent?: string;
};

export type NestType = SubprocessType & {
  nestType: string;
};

export interface RelationType {
  id: string;
  source: string;
  target: string;
  type: string;
  parent?: string;
  guard?: string;
}

export interface Process {
  events: EventType[];
  relations: RelationType[];
  nests?: NestType[];
  subprocesses?: SubprocessType[];
  parentProcess: string;
}

export interface TempEdge {
  source: string;
  target: string;
  type: string;
}

export interface Child {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Log {
  time: string;
  message: string;
}

export interface ChoregraphyInfo {
  nodesCount: number;
  roles: { role: string; label: string }[];
}

export type Element = Node | Edge | undefined;

export type ProjectionInfo = {
  nodes: Node[];
  edges: Edge[];
};

export interface Input {
  var: string;
  input: string;
}

export interface Participant {
  role: string;
  inputs: Input[];
}

export interface Parameter {
  var: string;
  type: string;
}

export interface SimpleRole {
  role: string;
  label: string;
  types: Parameter[];
}

export type State = {
  nodes: Node[];
  edges: Edge[];
  security: string;
  roles: SimpleRole[];
  code: string;
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
};
