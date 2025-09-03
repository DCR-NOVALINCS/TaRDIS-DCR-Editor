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
import { state, TempEdge } from "@/lib/types";

/**
 * Creates an edge object with default properties
 */
const createEdge = (
  type: string,
  source: string,
  target: string,
  additionalData: Partial<Edge["data"]> = {}
): Edge => ({
  id: `${type.charAt(0)}-${source}-${target}`,
  type,
  source,
  target,
  zIndex: 20000,
  data: {
    guard: "",
    ...additionalData,
  },
});

/**
 * Updates edge selection state
 */
const updateEdgeSelection = (edges: Edge[], selectedEdgeId: string): Edge[] => {
  return edges.map((edge) => ({
    ...edge,
    zIndex: edge.id === selectedEdgeId ? 30000 : 20000,
    selected: edge.id === selectedEdgeId,
  }));
};

/**
 * Represents the state and operations related to edges within the application.
 */
export type EdgesState = {
  /* ------------ EDGE OPERATIONS ------------ */
  /** The list of all current edges in the state */
  edges: Edge[];
  /** A temporary list of edges to be added */
  edgesToAdd: Edge[];
  /** The current type of relation used for edge creation */
  relationType: string;

  /* ------------ METHODS ------------ */
  /** Adds a new edge to the state */
  addEdge(edge: Edge): void;
  /** Updates an existing edge by ID */
  updateEdge(id: string, updatedEdge: Edge): void;
  /** Replaces the current edges with a new array */
  setEdges(newEdges: Edge[]): void;
  /** Deletes an edge by ID and returns it */
  deleteEdge(edgeId: string): Edge | null;
  /** Sets the current relation type */
  setRelationType(type: string): void;

  /* ------------ FLOW HANDLERS ------------ */
  /** Handler for when two nodes are connected */
  onConnect: OnConnect;
  /** Handler for edge change events */
  onEdgesChange: OnEdgesChange;
  /** Handler for edge click events */
  onEdgeClick(event: React.MouseEvent, edge: Edge): void;
  /** Handler for edge double-click events */
  onEdgeDoubleClick(event: React.MouseEvent, edge: Edge): void;
  /** Handler for edge deletion events */
  onEdgesDelete: OnEdgesDelete;
};

const edgesStateSlice: StateCreator<RFState, [], [], EdgesState> = (
  set,
  get
) => {
  const alreadyExistsEdge = (tempEdge: TempEdge): boolean => {
    const { source, target, type } = tempEdge;
    const exists = get().edges.some(
      (edge) =>
        edge.source === source && edge.target === target && edge.type === type
    );

    if (exists)
      get().log(
        `Invalid relation edge. Node ${source} already has a ${type} relation with ${target}.`
      );

    return exists;
  };

  return {
    /* ------------ INITIAL STATE ------------ */
    edges: state.edges ?? [],
    edgesToAdd: [],
    relationType: "",

    /* ------------ EDGE OPERATIONS ------------ */
    addEdge(edge: Edge): void {
      const { source, target, type } = edge;

      // Early return if edge already exists
      if (type && alreadyExistsEdge({ source, target, type })) return;

      get().log(
        `Added ${edge.type} relation from ${edge.source} to ${edge.target}`
      );

      set({
        edges:
          edge.type === "spawn"
            ? [edge, ...get().edges]
            : [...get().edges, edge],
        selectedElement: edge,
      });

      get().saveState();
    },

    setEdges(newEdges: Edge[]): void {
      set({ edges: newEdges });
    },

    updateEdge(id: string, updatedEdge: Edge): void {
      const currentEdges = get().edges;
      const edgeIndex = currentEdges.findIndex((edge) => edge.id === id);

      if (edgeIndex === -1) return;

      let newEdges = [...currentEdges];
      newEdges[edgeIndex] = updatedEdge;

      set({
        edges: newEdges,
        selectedElement: updatedEdge,
      });

      get().log(
        `Updated ${updatedEdge.type} relation between ${updatedEdge.source} and ${updatedEdge.target}`
      );
      get().saveState();
    },

    deleteEdge(edgeId: string): Edge | null {
      const currentEdges = get().edges;
      const edgeToDelete = currentEdges.find((edge) => edge.id === edgeId);

      if (!edgeToDelete) return null;

      set({
        edges: currentEdges.filter((edge) => edge.id !== edgeId),
      });

      return edgeToDelete;
    },

    setRelationType(type: string): void {
      set({ relationType: type });
    },

    /* ------------ FLOW HANDLERS ------------ */
    onConnect(connection: Connection): void {
      const { relationType: type } = get();
      const { source, target } = connection;

      // Validation checks
      if (!type || !source || !target) return;
      if (alreadyExistsEdge({ source, target, type })) return;

      const targetNode = get().getNode(target);
      if (!targetNode) return;

      // Validate spawn edge target
      if (type === "spawn" && targetNode.type !== "subprocess") {
        get().log(
          `Invalid spawn edge: ${source} -> ${target}. Target node must be a subprocess.`
        );
        return;
      }

      const edge = createEdge(type, source, target);
      get().addEdge(edge);
    },

    onEdgesChange(changes: EdgeChange[]): void {
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
      get().saveState();
    },

    onEdgeClick(event: React.MouseEvent, edge: Edge): void {
      event.preventDefault();

      set({
        edges: updateEdgeSelection(get().edges, edge.id),
        selectedElement: edge,
      });
    },

    onEdgeDoubleClick(event: React.MouseEvent, edge: Edge): void {
      event.preventDefault();
      get().openElementInDrawer(edge);
    },

    onEdgesDelete(deletedEdges: Edge[]): void {
      if (deletedEdges.length === 0) return;

      const deletedIds = deletedEdges.map((edge) => edge.id);
      get().log(`Deleted edges: ${deletedIds.join(", ")}.`);

      // Remove documentation for deleted edges
      deletedEdges.forEach((edge) => get().removeDocumentation(edge.id));

      set({
        edges: get().edges.filter((edge) => !deletedIds.includes(edge.id)),
      });
      get().saveState();
    },
    /* ----------------------------------------- */
  };
};

export default edgesStateSlice;
