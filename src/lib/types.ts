import { Edge, Node } from "@xyflow/react";
import { setState } from "./utils";
import { Field, Marking, Role } from "./gens/data-types/codegen-types";

export const state = await setState();

export const initialState: {
  nodes: Node[];
  edges: Edge[];
  roles: Role[];
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
      fields: [{ var: "id", type: "Integer" }],
    },
    {
      role: "Public",
      label: "Public",
      fields: [],
    },
  ],
  security: "Public flows P",
};

export const GLOBAL_PROJECTION = "global";
export const simpleInputTypes = ["Integer", "String", "Boolean"];
export const inputTypes = [...simpleInputTypes, "Record", "Unit"]; // "Reference" type not considered yet

export type NodeType = "event" | "nest" | "subprocess";
export type EventSubtype = "i" | "c";

export interface IdCounters {
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
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

export type SimulationMarkingType = Marking & {
  conditions: string[];
  milestones: string[];
  executable: boolean;
  executed: boolean;
  isParentSub: boolean;
  spawned?: boolean;
};

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

export type Element = Node | Edge | Node[] | undefined;

export type ProjectionInfo = {
  nodes: Node[];
  edges: Edge[];
};

export interface RepresentativeRole {
  role: string;
  label: string;
}

export type State = {
  nodes: Node[];
  edges: Edge[];
  security: string;
  roles: Role[];
  code: string;
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
};

export type FullState = State & {
  projectionInfo: Map<string, ProjectionInfo>;
  documentation: Map<string, string>;
};

export type Setter<T> = (value: T | ((prevState: T) => T)) => void;

export interface RoleAdd {
  role: string;
  label: string;
  fields: Field[];
}

export type History = {
  nodes: Node[];
  edges: Edge[];
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
  previousHistory?: History;
  nextHistory?: History;
};
