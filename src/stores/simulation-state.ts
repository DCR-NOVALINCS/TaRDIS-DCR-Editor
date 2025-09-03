import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import { Edge, Node } from "@xyflow/react";
import { MarkingType, SimulationMarkingType } from "@/lib/types";
import { cloneMap, delay } from "@/lib/utils";

export type SimulationState = {
  /* ------------ SIMULATION FLOW ------------ */
  nodeProperties: Map<string, SimulationMarkingType>;
  simNodes: Node[];
  simEdges: Edge[];
  simulationFlow: boolean;
  setSimulationFlow(value: boolean): void;
  onClickSimulationToggle(): void;
  startSimulation(): void;
  onNodeClickSimulation(event: any, node: Node): void;
  /* ----------------------------------------- */
};

const simulationStateSlice: StateCreator<RFState, [], [], SimulationState> = (
  set,
  get
) => {
  const isExecutable = (marking: SimulationMarkingType): boolean => {
    return (
      marking.included &&
      marking.conditions.length === 0 &&
      marking.milestones.length === 0
    );
  };

  const getConditionSources = (targetId: string): string[] => {
    return get()
      .edges.filter((ed) => ed.type === "condition" && ed.target === targetId)
      .map((ed) => ed.source);
  };

  const getMilestoneSources = (targetId: string): string[] => {
    return get()
      .edges.filter((ed) => {
        if (ed.type === "milestone" && ed.target === targetId) {
          const sourceNode = get().getNode(ed.source);
          if (sourceNode) {
            const sourceMarking = sourceNode.data.marking as MarkingType;
            return sourceMarking.pending;
          }
        }
        return false;
      })
      .map((ed) => ed.source);
  };

  const hasParentSubprocess = (nodeId: string): boolean => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node?.parentId) return false;

    return get().nodes.some(
      (sub) => sub.id === node.parentId && sub.type === "subprocess"
    );
  };

  const createSimulationMarking = (node: Node): SimulationMarkingType => {
    const marking = node.data.marking as MarkingType;
    const conditions = getConditionSources(node.id);
    const milestones = getMilestoneSources(node.id);
    const isParentSub = hasParentSubprocess(node.id);

    return {
      ...marking,
      conditions,
      milestones,
      executable: isExecutable({
        ...marking,
        conditions,
        milestones,
      } as SimulationMarkingType),
      executed: false,
      isParentSub,
      ...(node.type === "subprocess" && { spawned: false }),
    };
  };

  const updateMarkingByEdgeType = (
    marking: SimulationMarkingType,
    edgeType: string,
    sourceNodeId: string
  ): SimulationMarkingType => {
    switch (edgeType) {
      case "condition": {
        const conditions = marking.conditions.filter(
          (cond) => cond !== sourceNodeId
        );
        return {
          ...marking,
          conditions,
          executable: isExecutable({ ...marking, conditions }),
        };
      }

      case "response":
        return { ...marking, pending: true };

      case "include":
        return {
          ...marking,
          included: true,
          executable: isExecutable({ ...marking, included: true }),
        };

      case "exclude":
        return {
          ...marking,
          included: false,
          executable: false,
        };

      case "milestone": {
        const milestones = marking.milestones.filter(
          (mil) => mil !== sourceNodeId
        );
        return {
          ...marking,
          milestones,
          executable: isExecutable({ ...marking, milestones }),
        };
      }

      case "spawn":
        return marking.spawned ? marking : { ...marking, spawned: true };

      default:
        return marking;
    }
  };

  return {
    /* ------------ SIMULATION FLOW ------------ */
    nodeProperties: new Map<string, SimulationMarkingType>(),
    simNodes: [],
    simEdges: [],
    simulationFlow: false,

    setSimulationFlow(value: boolean) {
      get().log(value ? "Simulation started." : "Simulation stopped.");
      set({
        simulationFlow: value,
      });
    },
    onClickSimulationToggle() {
      const value = !get().simulationFlow;
      get().setSimulationFlow(value);

      if (value) get().startSimulation();
      else
        get().setNodes(get().nodes.map((nd) => ({ ...nd, selected: false })));
    },
    startSimulation() {
      // Create a single map for all node properties
      const newNodeProperties = new Map<string, SimulationMarkingType>();

      const simNodes = get().nodes.map((node) => {
        const simulationMarking = createSimulationMarking(node);
        newNodeProperties.set(node.id, simulationMarking);

        return simulationMarking.isParentSub
          ? { ...node, hidden: true, selected: false }
          : { ...node, selected: false };
      });

      const simEdges = get().edges.map((edge) => ({
        ...edge,
        selected: false,
      }));

      set({
        nodeProperties: newNodeProperties,
        simNodes,
        simEdges,
      });
    },
    async onNodeClickSimulation(event: any, node: Node) {
      event.preventDefault();

      const newMapClone = cloneMap(get().nodeProperties);
      const simulationMarking = newMapClone.get(node.id);

      if (!simulationMarking?.executable) return;

      // Update current node marking
      const updatedMarking = {
        ...simulationMarking,
        pending: false,
        executed: true,
      };

      const outEdges = get().simEdges.filter((ed) => ed.source === node.id);
      const milestonesArr: string[] = [];
      const spawnedParents: string[] = [];

      // Only set current node if it doesn't have self-loop
      if (!outEdges.some((ed) => ed.target === node.id))
        newMapClone.set(node.id, updatedMarking);

      // Process all outgoing edges
      for (const edge of outEdges) {
        const targetMarking =
          edge.target === node.id
            ? updatedMarking
            : newMapClone.get(edge.target);

        if (!targetMarking || !edge.type) continue;

        const updatedTargetMarking = updateMarkingByEdgeType(
          targetMarking,
          edge.type,
          node.id
        );

        // Handle special cases for response and spawn edges
        if (edge.type === "response") milestonesArr.push(edge.target);
        else if (edge.type === "spawn" && !targetMarking.spawned)
          spawnedParents.push(edge.target);

        newMapClone.set(edge.target, updatedTargetMarking);
      }

      await delay(10);

      // Handle milestone propagation
      for (const milestoneId of milestonesArr) {
        const milestoneEdges = get().edges.filter(
          (ed) => ed.source === milestoneId && ed.type === "milestone"
        );

        for (const edge of milestoneEdges) {
          const targetMarking = newMapClone.get(edge.target);
          if (!targetMarking) continue;

          const milestones = [...targetMarking.milestones, edge.source];
          newMapClone.set(edge.target, {
            ...targetMarking,
            milestones,
            executable: isExecutable({ ...targetMarking, milestones }),
          });
        }
      }

      await delay(10);

      // Update state with new properties and visible nodes
      set({
        nodeProperties: newMapClone,
        simNodes: get().simNodes.map((nd) => {
          if (nd.parentId && spawnedParents.includes(nd.parentId) && nd.hidden)
            return { ...nd, hidden: false };

          return nd;
        }),
      });
    },
    /* ----------------------------------------- */
  };
};

export default simulationStateSlice;
