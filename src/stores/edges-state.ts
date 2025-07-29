import {
  type Node,
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

const EDGE_Z_INDEX = {
  DEFAULT: 20000,
  SELECTED: 30000,
} as const;

const EDGE_ERRORS = {
  INVALID_SPAWN_TARGET: (source: string, target: string) =>
    `Invalid spawn edge: ${source} -> ${target}. Target node must be a subprocess.`,
  RELATION_EXISTS: (source: string, target: string, type: string) =>
    `Invalid relation edge. Node ${source} already has a ${type} relation with ${target}.`,
} as const;

/**
 * Generates a unique edge ID based on type, source, and target
 */
const generateEdgeId = (
  type: string,
  source: string,
  target: string
): string => {
  return `${type.charAt(0)}-${source}-${target}`;
};

/**
 * Creates an edge object with default properties
 */
const createEdge = (
  type: string,
  source: string,
  target: string,
  additionalData: Partial<Edge["data"]> = {}
): Edge => ({
  id: generateEdgeId(type, source, target),
  type,
  source,
  target,
  zIndex: EDGE_Z_INDEX.DEFAULT,
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
    zIndex:
      edge.id === selectedEdgeId ? EDGE_Z_INDEX.SELECTED : EDGE_Z_INDEX.DEFAULT,
    selected: edge.id === selectedEdgeId,
  }));
};

/**
 * Validates if a spawn edge target is valid
 */
const isValidSpawnTarget = (targetNode: Node, type: string): boolean => {
  return type !== "spawn" || targetNode.type === "subprocess";
};

/**
 * Represents the state and operations related to edges within the application.
 *
 * @property {Edge[]} edges - The list of all current edges in the state.
 * @property {Edge[]} edgeToAdd - A temporary list of edges to be added.
 * @property {string} relationType - The current type of relation used for edge creation or categorization.
 *
 * @method addEdge - Adds a new edge to the state.
 * @param {Edge} edge - The edge to add.
 * @returns {void}
 *
 * @method updateEdge - Updates an existing edge by ID.
 * @param {string} id - The ID of the edge to update.
 * @param {Edge} updatedEdge - The updated edge data.
 * @returns {void}
 *
 * @method setEdges - Replaces the current edges with a new array.
 * @param {Edge[]} newEdges - The new array of edges.
 * @returns {void}
 *
 * @method alreadyExistsEdge - Checks whether a temporary edge already exists in the current edge list.
 * @param {TempEdge} tempEdge - The temporary edge to check.
 * @returns {boolean} True if the edge already exists, false otherwise.
 *
 * @method deleteEdge - Deletes an edge by ID.
 * @param {string} edgeId - The ID of the edge to delete.
 * @returns {Edge} The deleted edge.
 *
 * @method setRelationType - Sets the current relation type.
 * @param {string} type - The relation type to set.
 * @returns {void}
 *
 * @property {OnConnect} onConnect - Handler for when two nodes are connected to form an edge.
 * @property {OnEdgesChange} onEdgesChange - Handler for edge change events.
 * @property {OnEdgesDelete} onEdgesDelete - Handler for edge deletion events.
 *
 * @method onEdgeClick - Handler for edge click events.
 * @param {any} event - The click event.
 * @param {Edge} edge - The edge that was clicked.
 * @returns {void}
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
  /** Checks whether a temporary edge already exists */
  alreadyExistsEdge(tempEdge: TempEdge): boolean;
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
) => ({
  /* ------------ INITIAL STATE ------------ */
  edges: state.edges ?? [],
  edgesToAdd: [],
  relationType: "",

  /* ------------ EDGE OPERATIONS ------------ */
  addEdge(edge: Edge): void {
    const { source, target, type } = edge;

    // Early return if edge already exists
    if (type && get().alreadyExistsEdge({ source, target, type })) return;

    get().log(
      `Added ${edge.type} relation from ${edge.source} to ${edge.target}`
    );

    set({
      edges:
        edge.type === "spawn" ? [edge, ...get().edges] : [...get().edges, edge],
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

  alreadyExistsEdge(tempEdge: TempEdge): boolean {
    const { source, target, type } = tempEdge;
    const exists = get().edges.some(
      (edge) =>
        edge.source === source && edge.target === target && edge.type === type
    );

    if (exists) get().log(EDGE_ERRORS.RELATION_EXISTS(source, target, type));

    return exists;
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
    if (get().alreadyExistsEdge({ source, target, type })) return;

    const targetNode = get().getNode(target);
    if (!targetNode) return;

    // Validate spawn edge target
    if (!isValidSpawnTarget(targetNode, type)) {
      get().log(EDGE_ERRORS.INVALID_SPAWN_TARGET(source, target));
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

    set({ edges: get().edges.filter((edge) => !deletedIds.includes(edge.id)) });
    get().saveState();
  },
  /* ----------------------------------------- */
});

export default edgesStateSlice;
