import { Node, Edge } from "@xyflow/react";
import { Role as GraphRole } from "./codegen-types";

/* ---------------------------------------------- visualgen-code.ts ---------------------------------------------- */

export const eventRegex = /\((.*?)\)\s*\((.*?)\)\s*\[(.*?)\](?:\s*\[(.*?)\])?/;

export const relationsMap: { [arrow: string]: string } = {
  "-->*": "condition",
  "*-->": "response",
  "-->+": "include",
  "-->%": "exclude",
  "--><>": "milestone",
  "-->>": "spawn",
};

export interface DCRGraph {
  roles: GraphRole[];
  security: string;
  nodes: Node[];
  edges: Edge[];
  nodeId: number;
  subId: number;
}

export interface CodeSplit {
  part: string[];
  code: string;
}

/* ---------------------------------------------- visualgen-json.ts ---------------------------------------------- */

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

type BasicType = "array" | "int" | "string" | "bool" | "void" | "float";

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
  propDeref: PropBasedExprSimple;
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
  | { record: { fields: { name: string; value: Expression }[] } }
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
  roleExpr: RoleExprSimple;
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
