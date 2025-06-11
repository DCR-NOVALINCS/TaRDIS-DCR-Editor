import { Node, Edge } from "@xyflow/react";
import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";

interface Log {
  time: string;
  message: string;
}

interface ChoregraphyInfo {
  nodesCount: number;
  roles: string[];
}

type Element = Node | Edge | undefined;

export type OtherState = {
  /* ------------ DOCUMENTATION -------------- */
  documentation: string;
  setDocumentation(documentation: string): void;
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
  eventMap: Map<string, string>;
  addToMap(key: string, value: string): void;
  setEventMap(eventMap: Map<string, string>): void;
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
};

const otherStateSlice: StateCreator<RFState, [], [], OtherState> = (
  set,
  get
) => ({
  /* ------------ DOCUMENTATION -------------- */
  documentation: "",
  setDocumentation(documentation: string) {
    set({
      documentation,
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
  eventMap: new Map<string, string>(),
  addToMap(key: string, value: string) {
    let newEventMap = get().eventMap;
    newEventMap.set(key, value);
    set({
      eventMap: newEventMap,
    });
  },
  setEventMap(eventMap: Map<string, string>) {
    set({
      eventMap,
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
      nodesCount: get().nodes.filter(
        (node) => node.type !== "nest" && node.type !== "subprocess"
      ).length,
      roles: get().rolesParticipants.map((role) => role.role),
    };
  },
  /* ----------------------------------------- */
});

export default otherStateSlice;
