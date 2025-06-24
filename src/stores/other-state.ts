import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import {
  ChoregraphyInfo,
  Log,
  type ProjectionInfo,
  type Element,
} from "@/lib/types";

/**
 * Represents miscellaneous application state and operations, including documentation,
 * element selection, simulation flow, security settings, code management, logs, and UI interactions.
 *
 * @property {Map<string, string>} documentation - A map storing documentation content keyed by unique IDs.
 *
 * @method addDocumentation - Adds or updates documentation for a specific ID.
 * @param {string} id - The unique identifier for the documentation.
 * @param {string} doc - The documentation content.
 * @returns {void}
 *
 * @method removeDocumentation - Removes documentation by its ID.
 * @param {string} id - The ID of the documentation to remove.
 * @returns {void}
 *
 * @property {Element} selectedElement - The currently selected element in the UI.
 *
 * @method setSelectedElement - Sets the selected element.
 * @param {Element} element - The element to set as selected.
 * @returns {void}
 *
 * @property {boolean} simulationFlow - Flag indicating whether the simulation flow is active.
 *
 * @method setSimulationFlow - Sets the simulation flow state.
 * @param {boolean} value - True to activate simulation flow, false to deactivate.
 * @returns {void}
 *
 * @property {string} security - The current security configuration or mode.
 *
 * @method setSecurity - Sets the security mode or configuration.
 * @param {string} security - The security value to set.
 * @returns {void}
 *
 * @property {string} code - The current code content.
 *
 * @method setCode - Updates the code content.
 * @param {string} code - The code string to set.
 * @returns {void}
 *
 * @method addToMap - Adds or updates a key-value pair in the event map.
 * @param {string} key - The key (typically an event ID).
 * @param {string} value - The associated value or metadata.
 * @returns {void}
 *
 * @property {Log[]} logs - A list of application logs for debugging or tracing.
 *
 * @method log - Adds a log message to the log history.
 * @param {string} message - The message to log.
 * @returns {void}
 *
 * @method setLogs - Replaces the current logs with a new array of log entries.
 * @param {Log[]} messages - The new array of logs.
 * @returns {void}
 *
 * @method onPaneClick - Handler for pane (canvas/background) click events.
 * @returns {void}
 *
 * @method getChoreographyInfo - Retrieves current choreography-related information.
 * @returns {ChoregraphyInfo} The current choreography metadata.
 */
export type OtherState = {
  /* ------------ DOCUMENTATION -------------- */
  documentation: Map<string, string>;
  addDocumentation(id: string, doc: string): void;
  removeDocumentation(id: string): void;
  /* ----------------------------------------- */

  /* ----------- SELECTED ELEMENT ------------ */
  selectedElement: Element;
  setSelectedElement(element: Element): void;
  /* ----------------------------------------- */

  /* ------------ SIMULATION FLOW ------------ */
  simulationFlow: boolean;
  setSimulationFlow(value: boolean): void;
  /* ----------------------------------------- */

  /* ---------------- SECURITY --------------- */
  security: string;
  setSecurity(security: string): void;
  /* ----------------------------------------- */

  /* ------------------ CODE ----------------- */
  code: string;
  setCode(code: string): void;
  /* ----------------------------------------- */

  /* ------------------ LOGS ----------------- */
  logs: Log[];
  log(message: string): void;
  setLogs(messages: Log[]): void;
  /* ----------------------------------------- */

  /* ----------------- OTHER ----------------- */
  onPaneClick(): void;
  getChoreographyInfo(): ChoregraphyInfo;
  /* ----------------------------------------- */

  /* -------------- PROJECTIONS -------------- */
  projectionInfo: Map<string, ProjectionInfo>;
  setProjectionInfo(id: string, projectionInfo: ProjectionInfo): void;
  clearProjections(all: boolean): ProjectionInfo | undefined;
  currentProjection: string;
  setCurrentProjection(id: string): void;
  /* ----------------------------------------- */

  /* -------------- DRAWER PROPS ------------- */
  drawerOpen: boolean;
  setDrawerOpen(open: boolean): void;
  drawerSelectedLogs: boolean;
  setDrawerSelectedLogs(selected: boolean): void;
  drawerSelectedCode: boolean;
  setDrawerSelectedCode(selected: boolean): void;
  drawerWidth: string;
  setDrawerWidth(width: string): void;
  /* ----------------------------------------- */
};

const otherStateSlice: StateCreator<RFState, [], [], OtherState> = (
  set,
  get
) => ({
  /* ------------ DOCUMENTATION -------------- */
  documentation: new Map<string, string>([["global", ""]]),
  addDocumentation(id: string, doc: string) {
    let newDocumentation = get().documentation;
    newDocumentation.set(id, doc);
    set({
      documentation: newDocumentation,
    });
  },
  removeDocumentation(id: string) {
    let newDocumentation = get().documentation;
    newDocumentation.delete(id);
    set({
      documentation: newDocumentation,
    });
  },
  /* ----------------------------------------- */

  /* ----------- SELECTED ELEMENT ------------ */
  selectedElement: undefined,
  setSelectedElement(element: Element) {
    set({
      selectedElement: element,
    });
  },
  /* ----------------------------------------- */

  /* ------------ SIMULATION FLOW ------------ */
  simulationFlow: false,
  setSimulationFlow(value: boolean) {
    get().log(value ? "Simulation started" : "Simulation stopped");
    set({
      simulationFlow: value,
    });
  },
  /* ----------------------------------------- */

  /* ---------------- SECURITY --------------- */
  security: "Public flows P",
  setSecurity(security: string) {
    set({ security });
  },
  /* ----------------------------------------- */

  /* ------------------ CODE ----------------- */
  code: "",
  setCode(code: string) {
    set({
      code,
    });
  },
  /* ----------------------------------------- */

  /* ------------------ LOGS ----------------- */
  logs: [],
  log(message: string) {
    set({
      logs: [...get().logs, { time: new Date().toLocaleTimeString(), message }],
    });
  },
  setLogs(messages: Log[]) {
    set({
      logs: messages,
    });
  },
  /* ----------------------------------------- */

  /* ----------------- OTHER ----------------- */
  onPaneClick() {
    set({
      selectedElement: undefined,
      nodes: get().nodes.map((node) => ({
        ...node,
        selected: false,
        zIndex:
          node.type === "nest" || node.type === "subprocess" ? 1000 : 10000,
      })),
      edges: get().edges.map((edge) => ({
        ...edge,
        selected: false,
        zIndex: 20000,
      })),
    });
  },
  getChoreographyInfo() {
    return {
      nodesCount: get().nodes.filter((node) => node.type === "event").length,
      roles: get().rolesParticipants.map((role) => ({
        role: role.role,
        label: role.label,
      })),
    };
  },
  /* ----------------------------------------- */

  /* -------------- PROJECTIONS -------------- */
  projectionInfo: new Map<string, ProjectionInfo>(),
  setProjectionInfo(id: string, projectionInfo: ProjectionInfo) {
    let newProjectionInfo = get().projectionInfo;
    if (newProjectionInfo.has(id)) newProjectionInfo.delete(id);
    newProjectionInfo.set(id, projectionInfo);
    set({
      projectionInfo: newProjectionInfo,
    });
  },
  clearProjections(all: boolean) {
    let newProjectionInfo = get().projectionInfo;

    if (all) {
      get().projectionInfo.forEach((_, k) => {
        if (newProjectionInfo.has(k)) newProjectionInfo.delete(k);
      });
    } else {
      get().projectionInfo.forEach((_, k) => {
        if (newProjectionInfo.has(k) && k !== "global")
          newProjectionInfo.delete(k);
      });
    }

    set({
      projectionInfo: newProjectionInfo,
    });
    return newProjectionInfo.get("global");
  },
  currentProjection: "",
  setCurrentProjection(id: string) {
    set({
      currentProjection: id,
    });
  },
  /* ----------------------------------------- */

  /* -------------- DRAWER PROPS ------------- */
  drawerOpen: false,
  setDrawerOpen(open: boolean) {
    set({
      drawerOpen: open,
    });
  },
  drawerSelectedLogs: false,
  setDrawerSelectedLogs(selected: boolean) {
    set({
      drawerSelectedLogs: selected,
    });
  },
  drawerSelectedCode: false,
  setDrawerSelectedCode(selected: boolean) {
    set({
      drawerSelectedCode: selected,
    });
  },
  drawerWidth: "25%",
  setDrawerWidth(width: string) {
    set({
      drawerWidth: width,
    });
  },
  /* ----------------------------------------- */
});

export default otherStateSlice;
