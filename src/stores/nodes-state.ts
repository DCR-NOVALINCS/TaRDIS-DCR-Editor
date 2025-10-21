import {
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type OnNodesChange,
  type OnNodesDelete,
  type XYPosition,
  applyNodeChanges,
  isEdge,
  isNode,
} from "@xyflow/react";
import { StateCreator } from "zustand/vanilla";
import { RFState } from "@/stores/store";
import { delay } from "@/lib/utils";
import { Setter, state, type EventType } from "@/lib/types";

// Type definitions
type NodeType = "event" | "nest" | "subprocess";
type EventSubtype = "i" | "c"; // input or computation

interface IdCounters {
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
}

// Node factory functions
const createNodeId = (
  type: NodeType,
  counters: IdCounters
): { id: string; updatedCounters: Partial<IdCounters> } => {
  const prefixMap = { event: "e", nest: "n", subprocess: "s" } as const;
  const counterMap = {
    event: "nextNodeId",
    nest: "nextGroupId",
    subprocess: "nextSubprocessId",
  } as const;

  const counterKey = counterMap[type];
  const currentCounter = counters[counterKey];
  const id = prefixMap[type] + currentCounter[0];
  const nextCounters = currentCounter.slice(1);

  return {
    id,
    updatedCounters: {
      [counterKey]:
        nextCounters.length === 0 ? [currentCounter[0] + 1] : nextCounters,
    },
  };
};

const createEventNode = (node: Node, id: string): Node => {
  const isInputEvent = node.data.type === "i";

  return {
    ...node,
    id,
    selected: true,
    data: {
      ...node.data,
      label: id,
      ...(isInputEvent
        ? { input: node.data.input || { type: "Unit" } }
        : { expression: node.data.expression || "" }),
    },
  };
};

const createSubgraphNode = (node: Node, id: string): Node => ({
  ...node,
  id,
  selected: true,
  data: {
    ...node.data,
    label: id,
    ...(node.type === "nest" && { nestType: "group" }),
  },
});

/**
 * Represents the state and operations related to nodes within the application.
 */
export type NodesState = {
  /* ---------- NODES AND PARENTING ---------- */
  // Core node state
  nodes: Node[];

  // ID management
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];

  // Event and subgraph types
  eventType: string;
  subgraphType: string;

  // Node operations
  addNode(...nodes: Node[]): void;
  updateNode(id: string, updatedNode: Node | EventType): string;
  setNodes: Setter<Node[]>;
  getNode(id: string): Node | undefined;
  getFamily(id: string): string[];

  // ID management
  setIds: Setter<IdCounters>;

  // Type setters
  setEventType(type: string): void;
  setSubgraphType(type: string): void;

  // Flow operations
  changeNodes(previous?: string, role?: string): Promise<void>;

  // Event handlers
  onNodesChange: OnNodesChange;
  onNodesDelete: OnNodesDelete;
  onNodeClick(event: any, node: Node): void;
  onNodeDoubleClick(event: any, node: Node): void;
  onNodeDragStart(event: any, node: Node): void;
  onNodeDragStop(event: any, node: Node): void;
  onDragOver(event: any): void;
  onDrop(
    event: any,
    screenToFlowPosition: (pos: XYPosition) => XYPosition
  ): void;
};

const nodesStateSlice: StateCreator<RFState, [], [], NodesState> = (
  set,
  get
) => {
  // Helper methods for node operations
  const handleNodeTypeConversion = (
    currentNode: Node,
    updatedNode: Node
  ): Node => {
    get().removeDocumentation(currentNode.id);

    if (currentNode.type === "nest" && updatedNode.type === "subprocess")
      return convertNestToSubprocess(currentNode, updatedNode);
    else if (currentNode.type === "subprocess" && updatedNode.type === "nest")
      return convertSubprocessToNest(currentNode, updatedNode);

    return updatedNode;
  };

  const updateEdgesForNodeTypeChange = async (
    id: string,
    newId: string
  ): Promise<void> => {
    await delay(10);
    get().setEdges((prev) =>
      prev
        .filter((edge) => (edge.data?.parent as string) !== id)
        .map((edge) => {
          if (edge.source === id) return { ...edge, source: newId };
          else if (edge.target === id) {
            if (edge.type !== "spawn") return { ...edge, target: newId };
          }

          return edge;
        })
    );
    get().saveState();
  };

  const convertNestToSubprocess = (
    currentNode: Node,
    updatedNode: Node
  ): Node => {
    const subprocessId = "s" + get().nextSubprocessId[0];
    const nextNestId = parseInt(currentNode.id.substring(1));
    const nexts = get().nextSubprocessId.slice(1);

    get().setIds((prev) => ({
      nextNodeId: prev.nextNodeId,
      nextGroupId: [nextNestId, ...prev.nextGroupId],
      nextSubprocessId:
        nexts.length === 0 ? [prev.nextSubprocessId[0] + 1] : nexts,
    }));

    const { nestType, ...restOfData } = updatedNode.data;
    return {
      ...updatedNode,
      id: subprocessId,
      data: {
        ...restOfData,
        label: subprocessId,
      },
    };
  };

  const convertSubprocessToNest = (
    currentNode: Node,
    updatedNode: Node
  ): Node => {
    const nestId = "n" + get().nextGroupId[0];
    const nextSubprocessId = parseInt(currentNode.id.substring(1));
    const nexts = get().nextGroupId.slice(1);

    get().setIds((prev) => ({
      nextNodeId: prev.nextNodeId,
      nextGroupId: nexts.length === 0 ? [prev.nextGroupId[0] + 1] : nexts,
      nextSubprocessId: [nextSubprocessId, ...prev.nextSubprocessId],
    }));

    return {
      ...updatedNode,
      id: nestId,
      data: {
        ...updatedNode.data,
        nestType: "group",
        label: nestId,
      },
    };
  };

  const handleParentChange = (updatedNode: Node): Node => {
    console.log("Handling parent change for node:", updatedNode);
    if (!updatedNode.parentId) return updatedNode;

    const parentNode = get().getNode(updatedNode.parentId);
    if (!parentNode) return updatedNode;

    const position = {
      x: (parentNode.width as number) / 2,
      y: (parentNode.height as number) / 2,
    };

    // Update position immediately
    get().onNodesChange([
      {
        id: updatedNode.id,
        type: "position",
        dragging: false,
        position,
      },
    ]);

    return { ...updatedNode, position };
  };

  const handlePositionChanges = (changes: NodePositionChange[]): void => {
    if (changes.length === 0) return;

    let childrenChanges: NodeChange[] = [];

    for (const change of changes) {
      const node = get().getNode(change.id);
      if (!node) continue;

      if (node.type === "nest" || node.type === "subprocess") {
        // Update children positions
        const children = get().nodes.filter(
          (child) => child.parentId === node.id
        );

        children.forEach((child) => {
          childrenChanges.push({
            id: child.id,
            type: "position",
            dragging: true,
            position: child.position,
          });
        });
      }

      // Update connected edges
      updateConnectedEdges(change.id);
    }

    get().saveState();
    if (childrenChanges.length > 0) get().onNodesChange(childrenChanges);
  };

  const updateConnectedEdges = async (nodeId: string): Promise<void> => {
    const edgesToUpdate = get().deleteEdge(
      ...get()
        .edges.filter(
          (edge) => edge.source === nodeId || edge.target === nodeId
        )
        .map((edge) => edge.id)
    );

    await delay(10);

    get().setEdges((prev) => [...prev, ...edgesToUpdate]);
  };

  const returnDeletedIds = (deletedNodes: Node[]): void => {
    get().setIds((prev) => ({
      nextNodeId: deletedNodes
        .filter((node) => node.type === "event")
        .map((node) => parseInt(node.id.slice(1)))
        .concat(prev.nextNodeId)
        .sort((a, b) => a - b),
      nextGroupId: deletedNodes
        .filter((node) => node.type === "nest")
        .map((node) => parseInt(node.id.slice(1)))
        .concat(prev.nextGroupId)
        .sort((a, b) => a - b),
      nextSubprocessId: deletedNodes
        .filter((node) => node.type === "subprocess")
        .map((node) => parseInt(node.id.slice(1)))
        .concat(prev.nextSubprocessId)
        .sort((a, b) => a - b),
    }));
  };

  const handleCtrlDoubleClick = (node: Node): void => {
    const relationType = get().relationType;
    if (!relationType || relationType === "spawn") return;

    const edge: Edge = {
      id: `s${relationType.charAt(0)}-${node.id}`,
      type: relationType,
      source: node.id,
      target: node.id,
      zIndex: 200000,
      data: { guard: "" },
    };

    get().addEdge(edge);
  };

  const createEventOnDrop = (eventType: string, position: XYPosition): void => {
    const node: Node = {
      id: "",
      type: "event",
      data: {
        initiators: [] as string[],
        receivers: [] as string[],
        type: eventType as EventSubtype,
        label: "",
        name: "",
        marking: {
          included: true,
          pending: false,
        },
        security: "",
      },
      parentId: "",
      position,
      zIndex: 10000,
    };

    get().addNode(node);
    get().setEventType("");
  };

  const createSubgraphOnDrop = (
    subgraphType: string,
    position: XYPosition
  ): void => {
    const node: Node = {
      id: "",
      type: subgraphType as NodeType,
      width: 200,
      height: 200,
      data: {
        ...(subgraphType === "nest" && { nestType: "group" }),
        label: "",
        marking: {
          included: true,
          pending: false,
        },
      },
      parentId: "",
      position,
      zIndex: 1000,
    };

    get().addNode(node);
    get().setSubgraphType("");
  };

  const updateParenting = async (updatedNode: Node): Promise<void> => {
    // Remove the node temporarily
    get().setNodes((prev) => prev.filter((node) => node.id !== updatedNode.id));
    await delay(10);

    if (updatedNode.type === "event") {
      // For events, just add back if not present
      if (!get().nodes.some((node) => node.id === updatedNode.id))
        get().setNodes((prev) => [...prev, updatedNode]);

      return;
    }

    // Handle parent nodes (nest, subprocess)
    const children = get().nodes.filter(
      (node) => node.parentId === updatedNode.id
    );
    const childrenIds = children.map((node) => node.id);

    // Update node order: parent first, then children
    get().setNodes((prev) => [
      ...prev.filter((node) => !childrenIds.includes(node.id)),
      updatedNode,
      ...children,
    ]);

    // Recursively update children
    children.forEach((child) => updateParenting(child));

    if (childrenIds.length > 0) {
      get().log(
        `Updated parenting for ${
          updatedNode.id
        } with children: ${childrenIds.join(", ")}.`
      );
    }
  };

  return {
    /* ---------- NODES AND PARENTING ---------- */
    // Initial state
    nodes: state.nodes ?? [],
    nextNodeId: state.nextNodeId ?? [0],
    nextGroupId: state.nextGroupId ?? [0],
    nextSubprocessId: state.nextSubprocessId ?? [0],
    eventType: "",
    subgraphType: "",

    // Node operations
    addNode(...nodes: Node[]) {
      const counters: IdCounters = {
        nextNodeId: get().nextNodeId,
        nextGroupId: get().nextGroupId,
        nextSubprocessId: get().nextSubprocessId,
      };

      const nodesToAdd: Node[] = [];
      for (const node of nodes) {
        const { id, updatedCounters } = createNodeId(
          node.type as NodeType,
          counters
        );

        set(updatedCounters);

        let nodeToAdd: Node;
        if (node.type === "event") {
          nodeToAdd = createEventNode(node, id);
          const eventType = node.data.type === "i" ? "Input" : "Computation";
          get().log(`${eventType} event added: ${id}.`);
        } else {
          nodeToAdd = createSubgraphNode(node, id);
          const capitalizedType =
            (node.type as string).charAt(0).toUpperCase() +
            (node.type as string).slice(1);
          get().log(`${capitalizedType} added: ${id}.`);
        }

        nodesToAdd.push(nodeToAdd);
      }

      get().setNodes((prev) => [
        ...prev.map((nd) => ({ ...nd, selected: false })),
        ...nodesToAdd,
      ]);
      get().setSelectedElement(
        nodesToAdd.length === 1 ? nodesToAdd[0] : undefined
      );
    },

    updateNode(id: string, updatedNode: Node | EventType): string {
      let finalNode = updatedNode;
      if ("data" in updatedNode) {
        const currentNode = get().getNode(id);
        if (!currentNode) return id;

        let nodeToUpdate = updatedNode;
        let typeChanged = false;

        // Handle node type conversions
        if (currentNode.type !== updatedNode.type) {
          nodeToUpdate = handleNodeTypeConversion(currentNode, updatedNode);
          typeChanged = true;
        }

        // Handle parent changes
        if (
          updatedNode.parentId &&
          updatedNode.parentId !== currentNode.parentId
        )
          nodeToUpdate = handleParentChange(nodeToUpdate);

        // Update the node in state
        get().setNodes((prev) =>
          prev.map((node) => (node.id === id ? nodeToUpdate : node))
        );
        get().setSelectedElement(nodeToUpdate);

        const capitalizedType =
          (nodeToUpdate.type as string).charAt(0).toUpperCase() +
          (nodeToUpdate.type as string).slice(1);
        get().log(`${capitalizedType} ${id} updated.`);

        updateParenting(nodeToUpdate);

        if (typeChanged) updateEdgesForNodeTypeChange(id, nodeToUpdate.id);
        finalNode = nodeToUpdate;
      } else {
        get().setNodes((prev) =>
          prev.map((node) => {
            if (node.id !== id) return node;

            const {
              label,
              name,
              security,
              initiators,
              marking,
              receivers,
              input,
              expression,
              parent,
            } = updatedNode;

            finalNode = {
              ...node,
              data: {
                ...node.data,
                ...(label && { label }),
                ...(name && { name }),
                ...(security && { security }),
                ...(initiators.length > 0 && { initiators }),
                ...(marking && { marking }),
                ...(receivers && { receivers }),
                ...(input && { input }),
                ...(expression && { expression }),
              },
              ...(parent && { parentId: parent }),
            };

            return finalNode;
          })
        );
      }

      return finalNode.id;
    },

    setNodes: (updater) => {
      set((state) => ({
        nodes: typeof updater === "function" ? updater(state.nodes) : updater,
      }));
      get().saveState();
    },

    getNode(id: string): Node | undefined {
      return get().nodes.find((node) => node.id === id);
    },

    getFamily(id: string): string[] {
      const getChildrenRecursive = (nodeId: string): string[] => {
        const children = get()
          .nodes.filter((node) => node.parentId === nodeId)
          .map((node) => node.id);

        let allDescendants = [...children];
        children.forEach((childId) => {
          allDescendants.push(...getChildrenRecursive(childId));
        });

        return allDescendants;
      };

      return getChildrenRecursive(id);
    },

    // ID management
    setIds: (updater) => {
      set((state) => {
        if (typeof updater === "function") {
          const counters = updater(state);
          return {
            nextNodeId: counters.nextNodeId,
            nextGroupId: counters.nextGroupId,
            nextSubprocessId: counters.nextSubprocessId,
          };
        }

        return {
          nextNodeId: updater.nextNodeId,
          nextGroupId: updater.nextGroupId,
          nextSubprocessId: updater.nextSubprocessId,
        };
      });

      get().saveState();
    },

    // Type setters
    setEventType(type: string): void {
      set({ eventType: type });
    },

    setSubgraphType(type: string): void {
      set({ subgraphType: type });
    },

    // Flow operations
    async changeNodes(previous?: string, role?: string): Promise<void> {
      // Save current state if previous projection specified
      if (previous)
        get().setProjectionInfo(previous, {
          nodes: get().nodes,
          edges: get().edges,
        });

      await delay(10);

      // Load projection state
      const projectionKey = role || "global";
      const projection = get().projectionInfo.get(projectionKey);

      if (projection) {
        get().setCurrentProjection(projectionKey);
        get().setNodes(projection.nodes);
        get().setEdges(projection.edges);
      }
    },

    // Event handlers
    onNodesChange(changes: NodeChange[]): void {
      get().setNodes((prev) => applyNodeChanges(changes, prev));

      // Handle position changes and update children/edges
      handlePositionChanges(changes.filter((ch) => ch.type === "position"));

      // Update selected element if it's a node
      const selectedElement = get().selectedElement;
      if (selectedElement && isNode(selectedElement)) {
        const updatedNode = get().getNode(selectedElement.id);
        if (updatedNode) get().setSelectedElement(updatedNode);
      }
    },

    onNodesDelete(deletedNodes: Node[]): void {
      const deletedIds = deletedNodes.map((node) => node.id);

      get().log(`Deleted nodes: ${deletedIds.join(", ")}.`);

      // Remove nodes and connected edges
      get().setNodes((prev) =>
        prev.filter((node) => {
          if (deletedIds.includes(node.id)) {
            get().removeDocumentation(node.id);
            return false;
          }
          return true;
        })
      );
      get().setEdges((prev) =>
        prev.filter((edge) => {
          if (
            !deletedIds.includes(edge.source) &&
            !deletedIds.includes(edge.target)
          ) {
            deletedIds.push(edge.id);
            get().removeDocumentation(edge.id);
            return true;
          }
          return false;
        })
      );
      get().setSelectedElement((prev) => {
        if (prev) {
          if (isNode(prev) || isEdge(prev)) {
            if (deletedIds.includes(prev.id)) return undefined;
          } else if (prev.some((el) => deletedIds.includes(el.id)))
            return undefined;
        }
        return prev;
      });

      // Return IDs to available pools
      returnDeletedIds(deletedNodes);
    },

    onNodeClick(event: any, node: Node): void {
      event.preventDefault();
      console.log("Node clicked:", node);

      get().setSelectedElement((prev) => {
        if (event.ctrlKey) {
          if (isNode(prev))
            if (prev.id !== node.id) return [prev, node];
            else if (
              Array.isArray(prev) &&
              !prev.some((el) => el.id === node.id)
            )
              return [...prev, node];
        }

        return node;
      });
    },

    onNodeDoubleClick(event: any, node: Node): void {
      event.preventDefault();

      if (event.ctrlKey) handleCtrlDoubleClick(node);
      else get().openElementInDrawer(node);
    },

    onNodeDragStart(event: any, node: Node): void {
      event.preventDefault();
      get().setSelectedElement(node);
    },

    onNodeDragStop(event: any, _: Node): void {
      event.preventDefault();
    },

    onDragOver(event: any): void {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },

    onDrop(
      event: any,
      screenToFlowPosition: (pos: XYPosition) => XYPosition
    ): void {
      event.preventDefault();

      const { eventType, subgraphType } = get();
      if (!eventType && !subgraphType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (eventType) createEventOnDrop(eventType, position);
      else if (subgraphType) createSubgraphOnDrop(subgraphType, position);
    },
  };
};

export default nodesStateSlice;
