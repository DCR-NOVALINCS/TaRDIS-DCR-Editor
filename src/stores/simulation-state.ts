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
  onNodeClickSimulation(event: any, node: Node): void;
  /* ----------------------------------------- */
};

const simulationStateSlice: StateCreator<RFState, [], [], SimulationState> = (
  set,
  get
) => {
  function startSimulation() {
    const { nodes, edges } = get();

    const simEdges: Edge[] = [];
    for (const edge of edges) {
      const { type, source, target } = edge;
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);

      if (!sourceNode || !targetNode || !type) continue;

      if (sourceNode.type === "event") {
        if (
          targetNode.type === "event" ||
          (targetNode.type === "subprocess" && type === "spawn")
        )
          simEdges.push(edge);
        else {
          const childrenIds = nodes
            .filter((n) => n.parentId === targetNode.id)
            .map((n) => n.id);

          for (const childId of childrenIds) {
            simEdges.push({
              id: `${type.charAt(0)}-${source}-${childId}`,
              source,
              target: childId,
              type,
            });
          }
        }
      } else {
        const childrenIds = nodes
          .filter((n) => n.parentId === sourceNode.id)
          .map((n) => n.id);

        for (const childId of childrenIds) {
          simEdges.push({
            id: `${type.charAt(0)}-${childId}-${target}`,
            source: childId,
            target,
            type,
          });
        }
      }
    }

    const nodeProperties = new Map<string, SimulationMarkingType>();

    const events = nodes.filter((n) => n.type === "event");
    const others = nodes.filter((n) => n.type !== "event");

    const simNodes: Node[] = [];
    for (const event of events) {
      const { id, data, parentId } = event;
      const { included, pending } = data.marking as MarkingType;

      const toEdges = simEdges.filter((e) => e.target === id);
      let conditions: string[] = [],
        milestones: string[] = [];
      const isParentSub = parentId ? true : false;

      for (const edge of toEdges) {
        const { source, type } = edge;
        const sourceNode = nodes.find((n) => n.id === source);

        if (!sourceNode) continue;
        const sourceMarking = sourceNode.data.marking as MarkingType;

        switch (type) {
          case "condition":
            if (sourceMarking.included) conditions.push(source);
            break;
          case "milestone":
            if (sourceMarking.included && sourceMarking.pending)
              milestones.push(source);
            break;
        }
      }

      nodeProperties.set(id, {
        included,
        pending,
        conditions,
        milestones,
        executable:
          conditions.length === 0 && milestones.length === 0 && included,
        executed: false,
        isParentSub,
      });

      simNodes.push({
        ...event,
        hidden: isParentSub,
        selected: false,
      });
    }

    for (const other of others) {
      const isParentSub = other.parentId ? true : false;

      nodeProperties.set(other.id, {
        included: true,
        pending: false,
        conditions: [],
        milestones: [],
        executable: false,
        executed: false,
        ...(other.type === "subprocess" && { spawned: false }),
        isParentSub,
      });

      simNodes.push({
        ...other,
        hidden: isParentSub,
      });
    }

    console.log(simEdges, nodeProperties);
    set({ simNodes, simEdges, nodeProperties });
  }

  function updateNodeProperties(nodeId: string) {
    const edges = get().simEdges;
    const nodeProperties = cloneMap(get().nodeProperties);
    const simulationMarking = nodeProperties.get(nodeId);

    if (!simulationMarking || !simulationMarking.executable) return;

    const fromEdges = edges.filter((e) => e.source === nodeId);
    const includes: string[] = [],
      excludes: string[] = [],
      milestonesReached: string[] = [];
    for (const edge of fromEdges) {
      const { target, type } = edge;
      const targetMarking = nodeProperties.get(target);

      if (!targetMarking) continue;

      let included = targetMarking.included,
        pending = targetMarking.pending;
      let conditions = targetMarking.conditions,
        milestones = targetMarking.milestones;
      let spawned: boolean | undefined = undefined;
      switch (type) {
        case "condition":
          if (conditions.includes(nodeId))
            conditions = conditions.filter((c) => c !== nodeId);
          break;
        case "response":
          if (!pending) {
            pending = true;
            milestonesReached.push(target);
          }
          break;
        case "milestone":
          if (milestones.includes(nodeId) && simulationMarking.pending)
            milestones = milestones.filter((m) => m !== nodeId);
          break;
        case "include":
          if (!included) {
            included = true;
            includes.push(target);
          }
          break;
        case "exclude":
          if (included) {
            included = false;
            excludes.push(target);
          }
          break;
        case "spawn":
          if ("spawned" in targetMarking && !spawned) {
            spawned = true;
            set({
              simNodes: get().simNodes.map((n) =>
                n.parentId === target ? { ...n, hidden: false } : n
              ),
            });
          }
          break;
      }

      nodeProperties.set(target, {
        ...targetMarking,
        included,
        pending,
        conditions,
        milestones,
        executable:
          conditions.length === 0 && milestones.length === 0 && included,
        executed: target === nodeId,
        ...(spawned !== undefined && { spawned }),
      });
    }

    set({ nodeProperties });
    if (
      includes.length > 0 ||
      excludes.length > 0 ||
      milestonesReached.length > 0
    )
      updateAll(includes, excludes, milestonesReached);
    console.log(nodeProperties);
  }

  async function updateAll(
    includes: string[],
    excludes: string[],
    milestonesReached: string[]
  ) {
    await delay(10);
    const nodeProperties = cloneMap(get().nodeProperties);

    for (const nodeId of includes) {
      const sourceMarking = nodeProperties.get(nodeId);
      if (!sourceMarking) continue;

      const fromEdges = get().simEdges.filter(
        (e) =>
          e.source === nodeId &&
          (e.type === "condition" || e.type === "milestone")
      );
      for (const edge of fromEdges) {
        const { target, type } = edge;

        const targetMarking = nodeProperties.get(target);
        if (!targetMarking) continue;

        const { conditions, milestones, included } = targetMarking;
        if (type === "condition" && !conditions.includes(nodeId))
          conditions.push(nodeId);
        else if (
          type === "milestone" &&
          !milestones.includes(nodeId) &&
          sourceMarking.pending
        )
          milestones.push(nodeId);

        nodeProperties.set(target, {
          ...targetMarking,
          conditions,
          milestones,
          executable:
            conditions.length === 0 && milestones.length === 0 && included,
        });
      }
    }

    for (const nodeId of excludes) {
      const sourceMarking = nodeProperties.get(nodeId);
      if (!sourceMarking) continue;

      const fromEdges = get().simEdges.filter(
        (e) =>
          e.source === nodeId &&
          (e.type === "condition" || e.type === "milestone")
      );
      for (const edge of fromEdges) {
        const { target, type } = edge;
        const targetMarking = nodeProperties.get(target);
        if (!targetMarking) continue;

        const { conditions, milestones, included } = targetMarking;
        if (type === "condition" && conditions.includes(nodeId))
          conditions.splice(conditions.indexOf(nodeId), 1);
        else if (type === "milestone" && milestones.includes(nodeId))
          milestones.splice(milestones.indexOf(nodeId), 1);

        nodeProperties.set(target, {
          ...targetMarking,
          conditions,
          milestones,
          executable:
            conditions.length === 0 && milestones.length === 0 && included,
        });
      }
    }

    for (const nodeId of milestonesReached) {
      const sourceMarking = nodeProperties.get(nodeId);
      if (!sourceMarking) continue;

      const fromEdges = get().simEdges.filter(
        (e) => e.source === nodeId && e.type === "milestone"
      );
      for (const edge of fromEdges) {
        const { target, type } = edge;
        const targetMarking = nodeProperties.get(target);
        if (!targetMarking) continue;

        const { conditions, milestones, included } = targetMarking;
        if (type === "milestone") milestones.push(nodeId);

        nodeProperties.set(target, {
          ...targetMarking,
          conditions,
          milestones,
          executable:
            conditions.length === 0 && milestones.length === 0 && included,
        });
      }
    }

    console.log(nodeProperties);
    set({ nodeProperties });
  }

  return {
    nodeProperties: new Map<string, SimulationMarkingType>(),
    simNodes: [],
    simEdges: [],
    simulationFlow: false,
    setSimulationFlow: (value: boolean) => set({ simulationFlow: value }),
    onClickSimulationToggle: () => {
      const simulationFlow = !get().simulationFlow;
      set({ simulationFlow });
      if (simulationFlow) startSimulation();
    },
    onNodeClickSimulation: (event: any, node: Node) => {
      event.preventDefault();
      updateNodeProperties(node.id);
    },
  };
};

export default simulationStateSlice;
