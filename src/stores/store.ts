import { createWithEqualityFn } from "zustand/traditional";
import nodesStateSlice, { NodesState } from "./nodes-state";
import edgesStateSlice, { EdgesState } from "./edges-state";
import rolesStateSlice, { RolesState } from "./roles-state";
import otherStateSlice, { OtherState } from "./other-state";

/**
 * Zustand store for managing the state of the DCR Graph.
 */
export type RFState = NodesState & EdgesState & RolesState & OtherState;

const useStore = createWithEqualityFn<RFState>()((set, get, store) => ({
  ...nodesStateSlice(set, get, store),
  ...edgesStateSlice(set, get, store),
  ...rolesStateSlice(set, get, store),
  ...otherStateSlice(set, get, store),
}));

export default useStore;
