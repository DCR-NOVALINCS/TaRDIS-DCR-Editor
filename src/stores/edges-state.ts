import {
  type Edge,
  type OnEdgesChange,
  type EdgeChange,
  type Connection,
  type OnConnect,
  type OnEdgesDelete,
  applyEdgeChanges,
} from "@xyflow/react";
import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";

interface TempEdge {
  source: string;
  target: string;
  type: string;
}

export type EdgesState = {
  /* ------------ EDGE OPERATIONS ------------ */
  edges: Edge[];
  edgeToAdd: Edge[];
  addEdge(edge: Edge): void;
  updateEdge(id: string, updatedEdge: Edge): void;
  setEdges(newEdges: Edge[]): void;
  alreadyExistsEdge(tempEdge: TempEdge): boolean;
  deleteEdge(edgeId: string): Edge;
  /* ----------------------------------------- */

  /* ------------- RELATION TYPE ------------- */
  relationType: string;
  setRelationType(type: string): void;
  /* ----------------------------------------- */

  /* ------------- FLOW RELATED -------------- */
  onConnect: OnConnect;
  onEdgesChange: OnEdgesChange;
  onEdgeClick(event: any, edge: Edge): void;
  onEdgesDelete: OnEdgesDelete;
  /* ----------------------------------------- */
};

const edgesStateSlice: StateCreator<RFState, [], [], EdgesState> = (
  set,
  get
) => ({
  /* ------------ EDGE OPERATIONS ------------ */
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
  edgeToAdd: [],
  addEdge(edge: Edge) {
    const { source, target, type } = edge;

    if (type && get().alreadyExistsEdge({ source, target, type })) return;

    get().log(
      `Added ${edge.type} relation from ${edge.source} to ${edge.target}`
    );
    set({
      edges:
        edge.type === "spawn" ? [edge, ...get().edges] : [...get().edges, edge],
    });
  },
  setEdges(newEdges: Edge[]) {
    set({
      edges: newEdges,
    });
  },
  updateEdge(id: string, updatedEdge: Edge) {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === id) {
          return updatedEdge;
        } else return edge;
      }),
    });

    get().log(
      `Updated ${updatedEdge.type} relation between ${updatedEdge.source} and ${updatedEdge.target}.`
    );
  },
  alreadyExistsEdge(tempEdge: TempEdge) {
    const exists = get().edges.some(
      (edge) =>
        edge.source === tempEdge.source &&
        edge.target === tempEdge.target &&
        edge.type === tempEdge.type
    );

    if (exists) {
      get().log(
        `Invalid relation edge. Node ${tempEdge.source} already has a ${tempEdge.type} relation with ${tempEdge.target}.`
      );
    }

    return exists;
  },
  deleteEdge(edgeId: string) {
    let edge = get().edges.find((edge) => edge.id === edgeId) as Edge;
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    });
    return edge;
  },
  /* ----------------------------------------- */

  /* ------------- RELATION TYPE ------------- */
  relationType: "",
  setRelationType(type: string) {
    set({
      relationType: type,
    });
  },
  /* ----------------------------------------- */

  /* ------------- FLOW RELATED -------------- */
  onConnect(connection: Connection) {
    const type = get().relationType;

    const { source, target } = connection;

    if (!type || get().alreadyExistsEdge({ source, target, type })) return;

    if (type === "spawn" && get().getNode(target).type !== "subprocess") {
      get().log(
        `Invalid spawn edge: ${source} -> ${target}. Target node must be a subprocess.`
      );
      return;
    }

    const edge: Edge = {
      id: type.charAt(0) + "-" + source + "-" + target,
      type,
      source,
      target,
      zIndex: 20000,
      data: {
        guard: "",
      },
    };

    get().addEdge(edge);
  },
  onEdgesChange(changes: EdgeChange[]) {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onEdgeClick(event: any, edge: Edge) {
    event.preventDefault();
    set({
      edges: get().edges.map((e) => {
        if (e.id === edge.id) {
          return { ...e, zIndex: 30000, selected: true };
        } else {
          return { ...e, zIndex: 20000, selected: false };
        }
      }),
      selectedElement: edge,
    });
  },
  onEdgesDelete(deletedEdges: Edge[]) {
    get().log(
      `Deleted edges: ${deletedEdges.map((node) => node.id).join(", ")}.`
    );

    set({
      edges: get().edges.filter(
        (edge) =>
          !deletedEdges.some((deletedEdge) => deletedEdge.id === edge.id)
      ),
    });
  },
  /* ----------------------------------------- */
});

export default edgesStateSlice;
