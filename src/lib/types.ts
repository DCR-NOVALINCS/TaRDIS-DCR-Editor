import { Edge, Node } from "@xyflow/react";

export const initialNodes: Node[] = [
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
];

export const initialEdges: Edge[] = [
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
];
