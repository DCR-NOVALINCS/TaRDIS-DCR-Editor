import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import {
  ChoregraphyInfo,
  Log,
  type ProjectionInfo,
  type Element,
  state,
} from "@/lib/types";
import type { Edge, Node } from "@xyflow/react";
import { delay, generateJsonData } from "@/lib/utils";

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
 * Creates a new Map instance to ensure immutability
 */
const cloneMap = <K, V>(originalMap: Map<K, V>): Map<K, V> => {
  return new Map(originalMap);
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
  setSelectedElement(element: Element): void;

  /* ---------------- SECURITY --------------- */
  /** The current security configuration or mode */
  security: string;
  /** Sets the security mode or configuration */
  setSecurity(security: string): void;

  /* ------------------ CODE ----------------- */
  /** The current code content */
  code: string;
  /** Updates the code content */
  setCode(code: string): void;

  /* ------------------ LOGS ----------------- */
  /** A list of application logs for debugging or tracing */
  logs: Log[];
  /** Adds a log message to the log history */
  log(message: string): void;
  /** Replaces the current logs with a new array of log entries */
  setLogs(messages: Log[]): void;

  /* -------------- PROJECTIONS -------------- */
  /** Map storing projection information */
  projectionInfo: Map<string, ProjectionInfo>;
  /** Sets projection information for a specific ID */
  setProjectionInfo(id: string, projectionInfo: ProjectionInfo): void;
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

  saveState(): void;
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

    let newDocumentation = cloneMap(get().documentation);
    newDocumentation.set(id, doc);

    set({ documentation: newDocumentation });
  },

  removeDocumentation(id: string): void {
    if (!id.trim()) return;

    let newDocumentation = cloneMap(get().documentation);
    const wasDeleted = newDocumentation.delete(id);

    if (!wasDeleted) return;

    set({ documentation: newDocumentation });
  },

  /* ----------- SELECTED ELEMENT ------------ */
  setSelectedElement(element: Element): void {
    set({ selectedElement: element });
  },

  /* ---------------- SECURITY --------------- */
  setSecurity(security: string): void {
    set({ security });
    get().saveState();
  },

  /* ------------------ CODE ----------------- */
  setCode(code: string): void {
    set({ code });
    get().saveState();
  },

  /* ------------------ LOGS ----------------- */
  log(message: string): void {
    if (!message.trim()) return;

    const logEntry = createLogEntry(message);

    set({
      logs: [...get().logs, logEntry],
    });
  },

  setLogs(messages: Log[]): void {
    set({ logs: messages });
  },

  /* -------------- PROJECTIONS -------------- */
  setProjectionInfo(id: string, projectionInfo: ProjectionInfo): void {
    if (!id.trim()) return;

    let newProjectionInfo = cloneMap(get().projectionInfo);
    newProjectionInfo.set(id, projectionInfo);

    set({ projectionInfo: newProjectionInfo });
  },

  clearProjections(all: boolean): Promise<ProjectionInfo> {
    const clearProjectionsAsync = async () => {
      const currentProjections = get().projectionInfo;
      let newProjectionInfo = cloneMap(currentProjections);

      // Clear projections based on the 'all' flag
      for (const [key] of currentProjections) {
        if (shouldClearProjection(key, all)) newProjectionInfo.delete(key);
      }

      await delay(10);

      const globalProjection = newProjectionInfo.get(
        APP_CONFIG.DEFAULTS.GLOBAL_ID
      );
      const nodes: Node[] = globalProjection ? globalProjection.nodes : [];
      const edges: Edge[] = globalProjection ? globalProjection.edges : [];
      set({
        nodes,
        edges,
        projectionInfo: newProjectionInfo,
        currentProjection: APP_CONFIG.DEFAULTS.GLOBAL_ID,
      });

      return { nodes, edges };
    };

    return clearProjectionsAsync();
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
    set({
      selectedElement: undefined,
      nodes: updateNodesSelection(get().nodes),
      edges: updateEdgesSelection(get().edges),
    });
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

  saveState(): void {
    const save = async () => {
      await delay(100);

      const { nodes, edges } = get();

      const data = JSON.stringify(
        generateJsonData(
          true,
          nodes,
          edges,
          get().security,
          get().roles,
          get().code,
          get().nextNodeId,
          get().nextGroupId,
          get().nextSubprocessId
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
    };

    if (get().currentProjection === "global") save();
  },
});

export default otherStateSlice;
