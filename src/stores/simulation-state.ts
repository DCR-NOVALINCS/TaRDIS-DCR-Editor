import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import { Edge, Node } from "@xyflow/react";
import { MarkingType, SimulationMarkingType } from "@/lib/types";
import { delay, multiMap } from "@/lib/utils";

export type SimulationState = {
  /* ------------ SIMULATION FLOW ------------ */
  simNodes: Node[];
  simEdges: Edge[];
  //setSimNodes(nodes: Node[]): void;
  //setSimEdges(edges: Edge[]): void;
  simulationFlow: boolean;
  setSimulationFlow(value: boolean): void;
  onClickSimulationToggle(event: any): void;
  onNodeClickSimulation(event: any, node: Node): void;
  updateChildEvents(): void;
  /* ----------------------------------------- */
};
const simulationStateSlice: StateCreator<RFState, [], [], SimulationState> = (
  set,
  get
) => ({
  /* ------------ SIMULATION FLOW ------------ */
  simNodes: [],
  simEdges: [],
  simulationFlow: false,
  setSimulationFlow(value: boolean) {
    get().log(value ? "Simulation started." : "Simulation stopped.");
    set({
      simulationFlow: value,
    });
  },
  onClickSimulationToggle(event: any) {
    event.preventDefault();
    const value = !get().simulationFlow;
    get().setSimulationFlow(value);

    if (value) {
      set({
        simNodes: get().nodes.map((node) => {
          const marking = node.data.marking as MarkingType;

          let isParentSub = get().nodes.some(
            (sub) => sub.id === node.parentId && sub.type === "subprocess"
          );

          return {
            ...node,
            data: {
              ...node.data,
              marking: {
                ...marking,
                executable:
                  marking.included &&
                  !get().edges.some(
                    (edge) =>
                      edge.target === node.id &&
                      (edge.type === "condition" ||
                        (edge.type === "milestone" &&
                          get().nodes.some(
                            (nd) =>
                              nd.id === edge.source &&
                              (nd.data.marking as Record<string, boolean>)
                                .pending
                          )))
                  ),
                executed: false,
                ...(node.type === "subprocess" && { spawned: false }),
              },
              conditions: get().edges.filter((ed) => {
                return (
                  ed.target === node.id && ed.type && ed.type === "condition"
                );
              }).length,
              milestones: get().edges.filter((ed) => {
                return (
                  ed.target === node.id &&
                  ed.type &&
                  ed.type === "milestone" &&
                  get().nodes.some(
                    (nd) =>
                      nd.id === ed.source &&
                      (nd.data.marking as Record<string, boolean>).pending
                  )
                );
              }).length,
            },
            hidden: isParentSub,
            selected: false,
          };
        }),
        simEdges: get().edges.map((edge) => ({ ...edge, selected: false })),
      });
    } else
      get().setNodes(get().nodes.map((nd) => ({ ...nd, selected: false })));
  },
  onNodeClickSimulation(event: any, node: Node) {
    event.preventDefault();
    const marking = node.data.marking as SimulationMarkingType;
    if (!marking.executable) return;

    const updatedSimNodes = get().simNodes.map((nd) => {
      let newMarking: SimulationMarkingType = nd.data
        .marking as SimulationMarkingType;
      let { conditions, milestones } = nd.data as {
        conditions: number;
        milestones: number;
      };

      if (nd.id === node.id)
        newMarking = {
          ...newMarking,
          executed: true,
          pending: false,
        };

      for (const ed of get().simEdges) {
        if (ed.type) {
          if (ed.source === node.id) {
            if (ed.target === nd.id) {
              if (nd.id === node.id) {
                switch (ed.type) {
                  case "response":
                    newMarking = {
                      ...newMarking,
                      pending: true,
                    };
                    break;
                  case "exclude":
                    newMarking = {
                      ...newMarking,
                      included: false,
                      executable: false,
                    };
                    break;
                }
              } else {
                switch (ed.type) {
                  case "condition":
                    conditions = conditions - 1;
                    newMarking = {
                      ...newMarking,
                      executable:
                        conditions === 0 &&
                        milestones === 0 &&
                        newMarking.included,
                    };
                    console.log(newMarking);
                    break;
                  case "response":
                    newMarking = {
                      ...newMarking,
                      pending: true,
                    };
                    break;
                  case "include":
                    newMarking = {
                      ...newMarking,
                      included: true,
                      executable: conditions === 0 && milestones === 0,
                    };
                    break;
                  case "exclude":
                    newMarking = {
                      ...newMarking,
                      included: false,
                      executable: false,
                    };
                    break;
                  case "milestone":
                    milestones = marking.pending ? milestones - 1 : milestones;
                    newMarking = {
                      ...newMarking,
                      executable:
                        conditions === 0 &&
                        milestones === 0 &&
                        newMarking.included,
                    };
                    break;
                  case "spawn":
                    newMarking = {
                      ...newMarking,
                      spawned: true,
                    };
                    break;
                }
              }
            }
          }
        }
      }

      return {
        ...nd,
        data: {
          ...nd.data,
          marking: newMarking,
          conditions,
          milestones,
        },
      };
    });

    set({
      simNodes: updatedSimNodes,
    });

    get().updateChildEvents();
  },
  updateChildEvents() {
    const change = async () => {
      await delay(10);

      let pendings: string[] = [];

      let updatedSimNodes = get()
        .simNodes.map((nd) => {
          if ((nd.data.marking as SimulationMarkingType).pending)
            pendings.push(nd.id);

          if (nd.parentId) {
            const parent = get().simNodes.find((n) => n.id === nd.parentId);

            if (
              parent &&
              parent.type === "subprocess" &&
              (parent.data.marking as Record<string, boolean>).spawned &&
              nd.hidden
            )
              return {
                ...nd,
                hidden: false,
              };
          }
          return nd;
        })
        .map((nd) => {
          let milestones = 0;
          get().edges.forEach((ed) => {
            if (
              ed.target === nd.id &&
              ed.type === "milestone" &&
              pendings.includes(ed.source)
            )
              milestones++;
          });
          return {
            ...nd,
            data: {
              ...nd.data,
              marking: {
                ...(nd.data.marking as SimulationMarkingType),
                executable: milestones === 0,
                milestones,
              },
            },
          };
        });

      set({
        simNodes: updatedSimNodes,
      });
    };

    change();
  },
  /* ----------------------------------------- */
});

export default simulationStateSlice;
