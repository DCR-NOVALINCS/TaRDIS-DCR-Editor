import {
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type OnNodesChange,
  type OnNodesDelete,
  type XYPosition,
  applyNodeChanges,
  isNode,
} from "@xyflow/react";
import { StateCreator } from "zustand/vanilla";
import { RFState } from "@/stores/store";
import { delay } from "@/lib/utils";
import { initialState, state, type EventType } from "@/lib/types";

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
 *
 * @property {Node[]} nodes - The list of all nodes in the current state.
 * @property {number[]} nextNodeId - The next available node IDs for new nodes.
 * @property {number[]} nextGroupId - The next available group IDs for new groups.
 * @property {number[]} nextSubprocessId - The next available subprocess IDs for new subprocesses.
 * @property {string} eventType - The current event type associated with node operations.
 * @property {string} subgraphType - The current subgraph type in use.
 * @property {OnNodesChange} onNodesChange - Handler for node change events.
 * @property {OnNodesDelete} onNodesDelete - Handler for node deletion events.
 *
 * @method addNode - Adds a new node to the state.
 * @param node - The node to add.
 * @returns The ID of the newly added node.
 *
 * @method updateNode - Updates an existing node by ID.
 * @param id - The ID of the node to update.
 * @param updatedNode - The updated node data.
 * @returns The ID of the updated node.
 *
 * @method updateNodeInfo - Updates information of a node based on an event.
 * @param id - The ID of the node to update.
 * @param event - The event data to apply.
 *
 * @method setNodes - Replaces the current nodes with a new array.
 * @param newNodes - The new array of nodes.
 *
 * @method getNode - Retrieves a node by its ID.
 * @param id - The ID of the node to retrieve.
 * @returns The node with the specified ID.
 *
 * @method getFamily - Retrieves the family (related node IDs) of a node.
 * @param id - The ID of the node.
 * @returns An array of related node IDs.
 *
 * @method updateParenting - Updates the parent-child relationships for a node.
 * @param updatedNode - The node with updated parenting information.
 *
 * @method parentInFront - Determines if a parent node is visually in front of a child node.
 * @param parentId - The ID of the parent node.
 * @param childId - The ID of the child node.
 * @returns True if the parent is in front, false otherwise.
 *
 * @method setIds - Sets the next available IDs for nodes, groups, and subprocesses.
 * @param nodeId - The next node IDs.
 * @param groupId - The next group IDs.
 * @param subprocessId - The next subprocess IDs.
 *
 * @method setEventType - Sets the current event type.
 * @param type - The event type to set.
 *
 * @method setSubgraphType - Sets the current subgraph type.
 * @param type - The subgraph type to set.
 *
 * @method onNodeClick - Handler for node click events.
 * @param event - The click event.
 * @param node - The node that was clicked.
 *
 * @method onNodeDoubleClick - Handler for node double-click events.
 * @param event - The double-click event.
 * @param node - The node that was double-clicked.
 *
 * @method onNodeDragStart - Handler for the start of a node drag event.
 * @param event - The drag start event.
 * @param node - The node being dragged.
 *
 * @method onNodeDragStop - Handler for the end of a node drag event.
 * @param event - The drag stop event.
 * @param node - The node that was dragged.
 *
 * @method onDragOver - Handler for drag-over events on the node area.
 * @param event - The drag-over event.
 *
 * @method onDrop - Handler for drop events on the node area.
 * @param event - The drop event.
 * @param screenToFlowPosition - Function or data to convert screen position to flow position.
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
  addNode(node: Node): string;
  updateNode(id: string, updatedNode: Node): string;
  updateNodeInfo(id: string, event: EventType): void;
  setNodes(newNodes: Node[]): void;
  getNode(id: string): Node | undefined;
  getFamily(id: string): string[];
  updateParenting(updatedNode: Node): void;
  parentInFront(parentId: string, childId: string): boolean;

  // ID management
  setIds(nodeId: number[], groupId: number[], subprocessId: number[]): void;

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

  // Helper Functions
  handleNodeTypeConversion(currentNode: Node, updatedNode: Node): Node;
  convertNestToSubprocess(currentNode: Node, updatedNode: Node): Node;
  convertSubprocessToNest(currentNode: Node, updatedNode: Node): Node;
  handleParentChange(updatedNode: Node): Node;
  handlePositionChanges(changes: NodePositionChange[]): void;
  updateConnectedEdges(nodeId: string): Promise<void>;
  returnDeletedIds(deletedNodes: Node[]): void;
  handleCtrlDoubleClick(node: Node): void;
  createEventOnDrop(eventType: string, position: XYPosition): void;
  createSubgraphOnDrop(subgraphType: string, position: XYPosition): void;
};

const nodesStateSlice: StateCreator<RFState, [], [], NodesState> = (
  set,
  get
) => ({
  /* ---------- NODES AND PARENTING ---------- */
  // Initial state
  nodes: state.nodes ?? [],
  nextNodeId: state.nextNodeId ?? [0],
  nextGroupId: state.nextGroupId ?? [0],
  nextSubprocessId: state.nextSubprocessId ?? [0],
  eventType: "",
  subgraphType: "",

  // Node operations
  addNode(node: Node): string {
    const counters = {
      nextNodeId: get().nextNodeId,
      nextGroupId: get().nextGroupId,
      nextSubprocessId: get().nextSubprocessId,
    };

    const { id, updatedCounters } = createNodeId(
      node.type as NodeType,
      counters
    );

    // Update counters
    set(updatedCounters);

    // Create the appropriate node type
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

    // Update state
    set({
      nodes: [
        ...get().nodes.map((nd) => ({ ...nd, selected: false })),
        nodeToAdd,
      ],
      selectedElement: nodeToAdd,
    });

    get().saveState();
    return id;
  },

  updateNode(id: string, updatedNode: Node): string {
    const currentNode = get().getNode(id);
    if (!currentNode) throw new Error(`Node with id ${id} not found`);

    let nodeToUpdate = updatedNode;

    // Handle node type conversions
    if (currentNode.type !== updatedNode.type)
      nodeToUpdate = get().handleNodeTypeConversion(currentNode, updatedNode);

    // Handle parent changes
    if (updatedNode.parentId && updatedNode.parentId !== currentNode.parentId)
      nodeToUpdate = get().handleParentChange(nodeToUpdate);

    // Update the node in state
    set({
      nodes: get().nodes.map((node) => (node.id === id ? nodeToUpdate : node)),
      selectedElement: nodeToUpdate,
    });

    const capitalizedType =
      (nodeToUpdate.type as string).charAt(0).toUpperCase() +
      (nodeToUpdate.type as string).slice(1);
    get().log(`${capitalizedType} ${id} updated.`);

    get().updateParenting(nodeToUpdate);
    get().saveState();
    return nodeToUpdate.id;
  },

  // Helper methods for node operations
  handleNodeTypeConversion(currentNode: Node, updatedNode: Node): Node {
    get().removeDocumentation(currentNode.id);

    if (currentNode.type === "nest" && updatedNode.type === "subprocess")
      return get().convertNestToSubprocess(currentNode, updatedNode);
    else if (currentNode.type === "subprocess" && updatedNode.type === "nest")
      return get().convertSubprocessToNest(currentNode, updatedNode);

    return updatedNode;
  },

  convertNestToSubprocess(currentNode: Node, updatedNode: Node): Node {
    const subprocessId = "s" + get().nextSubprocessId[0];
    const nextNestId = parseInt(currentNode.id.substring(1));
    const nexts = get().nextSubprocessId.slice(1);

    set({
      nextGroupId: [nextNestId, ...get().nextGroupId],
      nextSubprocessId:
        nexts.length === 0 ? [get().nextSubprocessId[0] + 1] : nexts,
    });

    const { nestType, ...restOfData } = updatedNode.data;
    return {
      ...updatedNode,
      id: subprocessId,
      data: {
        ...restOfData,
        label: subprocessId,
      },
    };
  },

  convertSubprocessToNest(currentNode: Node, updatedNode: Node): Node {
    const nestId = "n" + get().nextGroupId[0];
    const nextSubprocessId = parseInt(currentNode.id.substring(1));
    const nexts = get().nextGroupId.slice(1);

    set({
      nextGroupId: nexts.length === 0 ? [get().nextGroupId[0] + 1] : nexts,
      nextSubprocessId: [nextSubprocessId, ...get().nextSubprocessId],
    });

    return {
      ...updatedNode,
      id: nestId,
      data: {
        ...updatedNode.data,
        nestType: "group",
        label: nestId,
      },
    };
  },

  handleParentChange(updatedNode: Node): Node {
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
  },

  updateNodeInfo(id: string, event: EventType): void {
    set({
      nodes: get().nodes.map((node) => {
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
        } = event;

        return {
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
      }),
    });
    get().saveState();
  },

  setNodes(newNodes: Node[]): void {
    set({ nodes: newNodes });
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

  updateParenting(updatedNode: Node): void {
    const updateParentAsync = async () => {
      // Remove the node temporarily
      get().setNodes(get().nodes.filter((node) => node.id !== updatedNode.id));
      await delay(10);

      if (updatedNode.type === "event") {
        // For events, just add back if not present
        if (!get().nodes.some((node) => node.id === updatedNode.id))
          get().setNodes([...get().nodes, updatedNode]);

        return;
      }

      // Handle parent nodes (nest, subprocess)
      const children = get().nodes.filter(
        (node) => node.parentId === updatedNode.id
      );
      const childrenIds = children.map((node) => node.id);

      // Update node order: parent first, then children
      get().setNodes([
        ...get().nodes.filter((node) => !childrenIds.includes(node.id)),
        updatedNode,
        ...children,
      ]);

      // Recursively update children
      children.forEach((child) => get().updateParenting(child));

      if (childrenIds.length > 0) {
        get().log(
          `Updated parenting for ${
            updatedNode.id
          } with children: ${childrenIds.join(", ")}.`
        );
      }
    };

    updateParentAsync();
  },

  parentInFront(parentId: string, childId: string): boolean {
    const parentIndex = get().nodes.findIndex((node) => node.id === parentId);
    const childIndex = get().nodes.findIndex((node) => node.id === childId);
    return parentIndex < childIndex;
  },

  // ID management
  setIds(nodeId: number[], groupId: number[], subprocessId: number[]): void {
    set({
      nextNodeId: nodeId,
      nextGroupId: groupId,
      nextSubprocessId: subprocessId,
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
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });

    // Handle position changes and update children/edges
    get().handlePositionChanges(changes.filter((ch) => ch.type === "position"));

    // Update selected element if it's a node
    const selectedElement = get().selectedElement;
    if (selectedElement && isNode(selectedElement)) {
      const updatedNode = get().getNode(selectedElement.id);
      if (updatedNode) get().setSelectedElement(updatedNode);
    }
  },

  handlePositionChanges(changes: NodePositionChange[]): void {
    if (changes.length === 0) return;

    let childrenChanges: NodeChange[] = [];

    changes.forEach((change) => {
      const node = get().getNode(change.id);
      if (!node) return;

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
      get().updateConnectedEdges(change.id);
    });

    get().saveState();
    if (childrenChanges.length > 0) get().onNodesChange(childrenChanges);
  },

  async updateConnectedEdges(nodeId: string): Promise<void> {
    let edgesToUpdate: Edge[] = [];

    get().edges.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        const removedEdge = get().deleteEdge(edge.id);
        if (removedEdge) edgesToUpdate.push(removedEdge);
      }
    });

    await delay(10);

    set({
      edges: [...get().edges, ...edgesToUpdate],
    });
  },

  onNodesDelete(deletedNodes: Node[]): void {
    const deletedIds = deletedNodes.map((node) => node.id);

    get().log(`Deleted nodes: ${deletedIds.join(", ")}.`);

    // Clean up documentation
    deletedNodes.forEach((node) => get().removeDocumentation(node.id));

    // Remove nodes and connected edges
    set({
      nodes: get().nodes.filter((node) => !deletedIds.includes(node.id)),
      edges: get().edges.filter(
        (edge) =>
          !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
      ),
      selectedElement: undefined,
    });

    // Return IDs to available pools
    get().returnDeletedIds(deletedNodes);
    get().saveState();
  },

  returnDeletedIds(deletedNodes: Node[]): void {
    const nodeIds = deletedNodes
      .filter((node) => node.type === "event")
      .map((node) => parseInt(node.id.slice(1)))
      .concat(get().nextNodeId)
      .sort((a, b) => a - b);

    const groupIds = deletedNodes
      .filter((node) => node.type === "nest")
      .map((node) => parseInt(node.id.slice(1)))
      .concat(get().nextGroupId)
      .sort((a, b) => a - b);

    const subprocessIds = deletedNodes
      .filter((node) => node.type === "subprocess")
      .map((node) => parseInt(node.id.slice(1)))
      .concat(get().nextSubprocessId)
      .sort((a, b) => a - b);

    set({
      nextNodeId: nodeIds,
      nextGroupId: groupIds,
      nextSubprocessId: subprocessIds,
    });
  },

  onNodeClick(event: any, node: Node): void {
    event.preventDefault();
    get().setSelectedElement(node);
  },

  onNodeDoubleClick(event: any, node: Node): void {
    event.preventDefault();

    if (event.ctrlKey) get().handleCtrlDoubleClick(node);
    else get().openElementInDrawer(node);
  },

  handleCtrlDoubleClick(node: Node): void {
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

    if (eventType) get().createEventOnDrop(eventType, position);
    else if (subgraphType) get().createSubgraphOnDrop(subgraphType, position);
  },

  createEventOnDrop(eventType: string, position: XYPosition): void {
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
  },

  createSubgraphOnDrop(subgraphType: string, position: XYPosition): void {
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
  },
});

export default nodesStateSlice;
