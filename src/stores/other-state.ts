import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import {
  ChoregraphyInfo,
  Log,
  type ProjectionInfo,
  type Element,
  state,
  Setter,
} from "@/lib/types";
import type { Edge, Node } from "@xyflow/react";
import { cloneMap, delay, generateJsonData } from "@/lib/utils";

/**
 * Configuration constants for the application state
 */
const APP_CONFIG = {
  Z_INDEX: {
    NEST_SUBPROCESS: 1000,
    NODE_DEFAULT: 10000,
    EDGE_DEFAULT: 20000,
  },
  DEFAULTS: {
    DRAWER_WIDTH: "25%",
    GLOBAL_ID: "global",
  },
} as const;

/**
 * Creates a log entry with current timestamp
 */
const createLogEntry = (message: string): Log => ({
  time: new Date().toLocaleTimeString(),
  message,
});

/**
 * Updates node selection state and z-index
 */
const updateNodesSelection = (nodes: Node[]): Node[] => {
  return nodes.map((node) => ({
    ...node,
    selected: false,
    zIndex:
      node.type === "nest" || node.type === "subprocess"
        ? APP_CONFIG.Z_INDEX.NEST_SUBPROCESS
        : APP_CONFIG.Z_INDEX.NODE_DEFAULT,
  }));
};

/**
 * Updates edge selection state and z-index
 */
const updateEdgesSelection = (edges: Edge[]): Edge[] => {
  return edges.map((edge) => ({
    ...edge,
    selected: false,
    zIndex: APP_CONFIG.Z_INDEX.EDGE_DEFAULT,
  }));
};

/**
 * Filters projection entries based on the clear mode
 */
const shouldClearProjection = (key: string, clearAll: boolean): boolean => {
  return clearAll || key !== APP_CONFIG.DEFAULTS.GLOBAL_ID;
};

/**
 * Configures drawer state for opening an element
 */
const getElementDrawerConfig = (): Partial<DrawerConfig> => ({
  selectedLogs: false,
  selectedCode: false,
  width: APP_CONFIG.DEFAULTS.DRAWER_WIDTH,
  open: true,
});

/**
 * Utility type for drawer configuration
 */
interface DrawerConfig {
  open: boolean;
  selectedLogs: boolean;
  selectedCode: boolean;
  width: string;
}

/**
 * Represents miscellaneous application state and operations, including documentation,
 * element selection, simulation flow, security settings, code management, logs, and UI interactions.
 *
 */
export type OtherState = {
  /* ------------ DOCUMENTATION -------------- */
  /** Map storing documentation content keyed by unique IDs */
  documentation: Map<string, string>;
  /** Adds or updates documentation for a specific ID */
  addDocumentation(id: string, doc: string): void;
  /** Removes documentation by its ID */
  removeDocumentation(id: string): void;

  /* ----------- SELECTED ELEMENT ------------ */
  /** The currently selected element in the UI */
  selectedElement: Element;
  /** Sets the selected element */
  setSelectedElement: Setter<Element | Node[]>;

  /* ---------------- SECURITY --------------- */
  /** The current security configuration or mode */
  security: string;
  /** Sets the security mode or configuration */
  setSecurity: Setter<string>;

  /* ------------------ CODE ----------------- */
  /** The current code content */
  code: string;
  /** Updates the code content */
  setCode: Setter<string>;

  /* ------------------ LOGS ----------------- */
  /** A list of application logs for debugging or tracing */
  logs: Log[];
  /** Adds a log message to the log history */
  log(message: string): void;
  /** Replaces the current logs with a new array of log entries */
  setLogs: Setter<Log[]>;

  /* -------------- PROJECTIONS -------------- */
  /** Map storing projection information */
  projectionInfo: Map<string, ProjectionInfo>;
  /** Sets projection information for a specific ID */
  setProjectionInfo(id: string, projInfo: ProjectionInfo): void;
  /** Clears projections (all or excluding global) */
  clearProjections(all: boolean): Promise<ProjectionInfo>;
  /** Current projection ID */
  currentProjection: string;
  /** Sets the current projection ID */
  setCurrentProjection(id: string): void;

  /* -------------- DRAWER PROPS ------------- */
  /** Drawer open state */
  drawerOpen: boolean;
  /** Sets drawer open state */
  setDrawerOpen(open: boolean): void;
  /** Drawer logs selection state */
  drawerSelectedLogs: boolean;
  /** Sets drawer logs selection state */
  setDrawerSelectedLogs(selected: boolean): void;
  /** Drawer code selection state */
  drawerSelectedCode: boolean;
  /** Sets drawer code selection state */
  setDrawerSelectedCode(selected: boolean): void;
  /** Drawer width */
  drawerWidth: string;
  /** Sets drawer width */
  setDrawerWidth(width: string): void;

  /* ----------------- HANDLERS -------------- */
  /** Handler for pane (canvas/background) click events */
  onPaneClick(): void;
  /** Retrieves current choreography-related information */
  getChoreographyInfo(): ChoregraphyInfo;
  /** Opens an element in the drawer */
  openElementInDrawer(element: Node | Edge): void;

  edgesTypes: "old" | "new";
  setEdgesTypes(type: "old" | "new"): void;

  saveState(): Promise<void>;
};

const otherStateSlice: StateCreator<RFState, [], [], OtherState> = (
  set,
  get
) => ({
  /* ------------ INITIAL STATE -------------- */
  documentation: new Map<string, string>([[APP_CONFIG.DEFAULTS.GLOBAL_ID, ""]]),
  selectedElement: undefined,
  security: state.security ?? "",
  code: state.code,
  logs: [],
  projectionInfo: new Map<string, ProjectionInfo>([
    [APP_CONFIG.DEFAULTS.GLOBAL_ID, { nodes: state.nodes, edges: state.edges }],
  ]),
  currentProjection: APP_CONFIG.DEFAULTS.GLOBAL_ID,
  drawerOpen: false,
  drawerSelectedLogs: false,
  drawerSelectedCode: false,
  drawerWidth: APP_CONFIG.DEFAULTS.DRAWER_WIDTH,

  /* ------------ DOCUMENTATION -------------- */
  addDocumentation(id: string, doc: string): void {
    if (!id.trim()) return;

    set((state) => {
      const documentation = cloneMap(state.documentation);
      documentation.set(id, doc);
      return { documentation };
    });
  },

  removeDocumentation(id: string): void {
    if (!id.trim()) return;

    set((state) => {
      const documentation = cloneMap(state.documentation);
      documentation.delete(id);
      return { documentation };
    });
  },

  /* ----------- SELECTED ELEMENT ------------ */
  setSelectedElement: (updater) => {
    set((state) => ({
      selectedElement:
        typeof updater === "function"
          ? updater(state.selectedElement)
          : updater,
    }));
  },

  /* ---------------- SECURITY --------------- */
  setSecurity: (updater) => {
    set((state) => ({
      security:
        typeof updater === "function" ? updater(state.security) : updater,
    }));
    get().saveState();
  },

  /* ------------------ CODE ----------------- */
  setCode: (updater) => {
    set((state) => ({
      code: typeof updater === "function" ? updater(state.code) : updater,
    }));
    get().saveState();
  },

  /* ------------------ LOGS ----------------- */
  log(message: string): void {
    if (!message.trim()) return;

    get().setLogs((prev) => [createLogEntry(message), ...prev]);
  },

  setLogs: (updater) => {
    set((state) => ({
      logs: typeof updater === "function" ? updater(state.logs) : updater,
    }));
  },

  /* -------------- PROJECTIONS -------------- */
  setProjectionInfo(id: string, projInfo: ProjectionInfo): void {
    if (!id.trim()) return;

    set((state) => {
      const projectionInfo = cloneMap(state.projectionInfo);
      projectionInfo.set(id, projInfo);
      return { projectionInfo };
    });
  },

  async clearProjections(all: boolean): Promise<ProjectionInfo> {
    const currentProjections = get().projectionInfo;
    let projectionInfo = cloneMap(currentProjections);

    // Clear projections based on the 'all' flag
    for (const [key] of currentProjections)
      if (shouldClearProjection(key, all)) projectionInfo.delete(key);

    await delay(10);

    const globalProjection = projectionInfo.get(APP_CONFIG.DEFAULTS.GLOBAL_ID);
    const nodes: Node[] = globalProjection ? globalProjection.nodes : [];
    const edges: Edge[] = globalProjection ? globalProjection.edges : [];
    set({
      nodes,
      edges,
      projectionInfo,
      currentProjection: APP_CONFIG.DEFAULTS.GLOBAL_ID,
    });

    return { nodes, edges };
  },

  setCurrentProjection(id: string): void {
    set({ currentProjection: id });
  },

  /* -------------- DRAWER PROPS ------------- */
  setDrawerOpen(open: boolean): void {
    set({ drawerOpen: open });
  },

  setDrawerSelectedLogs(selected: boolean): void {
    set({ drawerSelectedLogs: selected });
  },

  setDrawerSelectedCode(selected: boolean): void {
    set({ drawerSelectedCode: selected });
  },

  setDrawerWidth(width: string): void {
    set({ drawerWidth: width });
  },

  /* ----------------- HANDLERS -------------- */
  onPaneClick(): void {
    get().setSelectedElement(undefined);
    get().setNodes((prev) => updateNodesSelection(prev));
    get().setEdges((prev) => updateEdgesSelection(prev));
  },

  getChoreographyInfo(): ChoregraphyInfo {
    return {
      nodesCount: get().nodes.filter((node) => node.type === "event").length,
      roles: get().roles.map((role) => ({
        role: role.role,
        label: role.label,
      })),
    };
  },

  openElementInDrawer(element: Node | Edge): void {
    if (!element) return;

    const drawerConfig = getElementDrawerConfig();

    // Apply all drawer configurations at once
    get().setSelectedElement(element);
    get().setDrawerSelectedLogs(drawerConfig.selectedLogs!);
    get().setDrawerSelectedCode(drawerConfig.selectedCode!);
    get().setDrawerWidth(drawerConfig.width!);
    get().setDrawerOpen(drawerConfig.open!);
  },

  edgesTypes: "old",
  setEdgesTypes(type: "old" | "new"): void {
    set({ edgesTypes: type });
  },

  async saveState(): Promise<void> {
    if (get().currentProjection !== "global") return;

    await delay(100);

    const {
      nodes,
      edges,
      security,
      roles,
      code,
      nextNodeId,
      nextGroupId,
      nextSubprocessId,
    } = get();

    const data = JSON.stringify(
      generateJsonData(
        true,
        nodes,
        edges,
        security,
        roles,
        code,
        nextNodeId,
        nextGroupId,
        nextSubprocessId
      )
    );

    get().setProjectionInfo("global", { nodes, edges });

    await fetch("/api/example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "current", data }),
    })
      .then((res) => res.text())
      .then(console.log);
  },
});

export default otherStateSlice;
