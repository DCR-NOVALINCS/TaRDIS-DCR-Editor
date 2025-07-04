import { createWithEqualityFn } from "zustand/traditional";
import nodesStateSlice, { NodesState } from "./nodes-state";
import edgesStateSlice, { EdgesState } from "./edges-state";
import rolesStateSlice, { RolesState } from "./roles-state";
import otherStateSlice, { OtherState } from "./other-state";
import simulationStateSlice, { SimulationState } from "./simulation-state";

/**
 * Represents the combined state of the application, including nodes, edges, roles, and other relevant state properties.
 *
 * This type is a composition of:
 * - `NodesState`: State related to nodes.
 * - `EdgesState`: State related to edges.
 * - `RolesState`: State related to user or system roles.
 * - `OtherState`: Any additional state required by the application.
 */
export type RFState = NodesState &
  EdgesState &
  RolesState &
  SimulationState &
  OtherState;

const useStore = createWithEqualityFn<RFState>()((set, get, store) => ({
  ...nodesStateSlice(set, get, store),
  ...edgesStateSlice(set, get, store),
  ...rolesStateSlice(set, get, store),
  ...simulationStateSlice(set, get, store),
  ...otherStateSlice(set, get, store),
}));

export default useStore;
