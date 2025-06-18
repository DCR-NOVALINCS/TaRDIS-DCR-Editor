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
import { initialEdges } from "@/lib/types";

interface TempEdge {
  source: string;
  target: string;
  type: string;
}

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
  edges: initialEdges,
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
      selectedElement: edge,
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
      selectedElement: updatedEdge,
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

    deletedEdges.forEach((ed) => get().removeDocumentation(ed.id));
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
