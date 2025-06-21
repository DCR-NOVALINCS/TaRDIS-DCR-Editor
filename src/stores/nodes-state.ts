import {
  type Edge,
  type Node,
  type NodeChange,
  type OnNodesChange,
  type OnNodesDelete,
  applyNodeChanges,
  isNode,
} from "@xyflow/react";

import { StateCreator } from "zustand/vanilla";
import { RFState } from "@/stores/store";

import { delay } from "@/lib/utils";
import { initialNodes, type EventType } from "@/lib/types";

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
  nodes: Node[];
  addNode(node: Node): string;
  updateNode(id: string, updatedNode: Node): string;
  updateNodeInfo(id: string, event: EventType): void;
  setNodes(newNodes: Node[]): void;
  getNode(id: string): Node;
  getFamily(id: string): string[];
  updateParenting(updatedNode: Node): void;
  parentInFront(parentId: string, childId: string): boolean;
  /* ----------------------------------------- */

  /* ------------------ IDS ------------------ */
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
  setIds(nodeId: number[], groupId: number[], subprocessId: number[]): void;
  /* ----------------------------------------- */

  /* -------------- EVENT TYPE --------------- */
  eventType: string;
  setEventType(type: string): void;
  /* ----------------------------------------- */

  subgraphType: string;
  setSubgraphType(type: string): void;

  /* ------------- FLOW RELATED -------------- */
  changeNodes(previous?: string, role?: string): Promise<void>;
  onNodesChange: OnNodesChange;
  onNodesDelete: OnNodesDelete;
  onNodeClick(event: any, node: Node): void;
  onNodeDoubleClick(event: any, node: Node): void;
  onNodeDragStart(event: any, node: Node): void;
  onNodeDragStop(event: any, node: Node): void;
  onDragOver(event: any): void;
  onDrop(event: any, screenToFlowPosition: any): void;
  /* ----------------------------------------- */
};

const nodesStateSlice: StateCreator<RFState, [], [], NodesState> = (
  set,
  get
) => ({
  /* ---------- NODES AND PARENTING ---------- */
  nodes: initialNodes,
  addNode(node: Node) {
    let id = "";
    if (node.type === "nest") {
      id = "n" + get().nextGroupId[0];
      const nexts = get().nextGroupId.slice(1);
      set({
        nextGroupId: nexts.length === 0 ? [get().nextGroupId[0] + 1] : nexts,
      });
    } else if (node.type === "subprocess") {
      id = "s" + get().nextSubprocessId[0];
      const nexts = get().nextSubprocessId.slice(1);
      set({
        nextSubprocessId:
          nexts.length === 0 ? [get().nextSubprocessId[0] + 1] : nexts,
      });
    } else {
      id = "e" + get().nextNodeId[0];
      const nexts = get().nextNodeId.slice(1);
      set({
        nextNodeId: nexts.length === 0 ? [get().nextNodeId[0] + 1] : nexts,
      });
    }

    let nodeToAdd: Node;
    if (node.type === "event") {
      if (node.data.type === "i") {
        nodeToAdd = {
          ...node,
          id,
          selected: true,
          data: {
            ...node.data,
            label: id,
            input: node.data.input ? node.data.input : { type: "Unit" },
          },
        };
        get().log(`Input event added: ${id}.`);
      } else {
        nodeToAdd = {
          ...node,
          id,
          selected: true,
          data: {
            ...node.data,
            label: id,
            expression: node.data.expression ? node.data.expression : "",
          },
        };
        get().log(`Computation event added: ${id}.`);
      }
    } else {
      nodeToAdd = {
        ...node,
        id,
        selected: true,
        data: {
          ...node.data,
          label: id,
        },
      };
      const type = nodeToAdd.type as string;

      get().log(
        `${type.charAt(0).toUpperCase() + type.slice(1)} added: ${id}.`
      );
    }

    set({
      nodes: [
        ...get().nodes.map((nd) => ({ ...nd, selected: false })),
        nodeToAdd,
      ],
      selectedElement: nodeToAdd,
    });

    return id;
  },
  updateNode(id: string, updatedNode: Node) {
    let nodeRet = updatedNode;

    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          if (node.type === "nest" && updatedNode.type === "subprocess") {
            get().removeDocumentation(node.id);
            const subprocessId = "s" + get().nextSubprocessId[0];
            const nextNestId = parseInt(node.id.substring(1));
            const nexts = get().nextSubprocessId.slice(1);
            set({
              nextGroupId: [nextNestId, ...get().nextGroupId],
              nextSubprocessId:
                nexts.length === 0 ? [get().nextSubprocessId[0] + 1] : nexts,
            });
            const { nestType, ...restOfData } = updatedNode.data;
            nodeRet = {
              ...updatedNode,
              id: subprocessId,
              data: {
                ...restOfData,
                label: subprocessId,
              },
            };
          } else if (
            node.type === "subprocess" &&
            updatedNode.type === "nest"
          ) {
            get().removeDocumentation(node.id);
            const nestId = "n" + get().nextGroupId[0];
            const nextSubprocessId = parseInt(node.id.substring(1));
            const nexts = get().nextGroupId.slice(1);
            set({
              nextGroupId:
                nexts.length === 0 ? [get().nextGroupId[0] + 1] : nexts,
              nextSubprocessId: [nextSubprocessId, ...get().nextSubprocessId],
            });
            nodeRet = {
              ...updatedNode,
              id: nestId,
              data: {
                ...updatedNode.data,
                nestType: "group",
                label: nestId,
              },
            };
          } else {
            if (updatedNode.parentId) {
              const parentNode = get().getNode(updatedNode.parentId);
              if (
                !node.parentId ||
                (node.parentId && updatedNode.parentId !== node.parentId)
              ) {
                const position = {
                  x: (parentNode.width as number) / 2,
                  y: (parentNode.height as number) / 2,
                };
                nodeRet = {
                  ...updatedNode,
                  position,
                };

                get().onNodesChange([
                  {
                    id: updatedNode.id,
                    type: "position",
                    dragging: false,
                    position,
                  },
                ]);
              }
            }
          }
          return nodeRet;
        } else return node;
      }),
      selectedElement: nodeRet,
    });

    const type = nodeRet.type as string;
    get().log(`${type.charAt(0).toUpperCase() + type.slice(1)} ${id} updated.`);

    get().updateParenting(nodeRet);
    return nodeRet.id;
  },
  updateNodeInfo(id: string, event: EventType) {
    set({
      nodes: get().nodes.map((nd) => {
        if (nd.id === id) {
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
            ...nd,
            data: {
              ...nd.data,
              ...(label && { label }),
              ...(name && { name }),
              ...(security && { security }),
              ...(initiators.length > 0 && { initiators }),
              marking,
              ...(receivers && { receivers }),
              ...(input && { input }),
              ...(expression && { expression }),
            },
            ...(parent && { parentId: parent }),
          };
        } else return nd;
      }),
    });
  },
  setNodes(newNodes: Node[]) {
    set({
      nodes: newNodes,
    });
  },
  getNode(id: string) {
    return get().nodes.find((n) => n.id === id) as Node;
  },
  getFamily(id: string) {
    let childrenIds = get()
      .nodes.filter((nd) => nd.parentId && nd.parentId === id)
      .map((nd) => nd.id);

    childrenIds.forEach((chId) => childrenIds.push(...get().getFamily(chId)));

    return childrenIds;
  },
  updateParenting(updatedNode: Node) {
    const updateParent = async () => {
      get().setNodes(get().nodes.filter((nd) => nd.id !== updatedNode.id));

      await delay(10);

      if (updatedNode.type !== "event") {
        const childrenNodes = get().nodes.filter(
          (nd) => nd.parentId && nd.parentId === updatedNode.id
        );

        const childrenIds = childrenNodes.map((nd) => nd.id);

        get().setNodes([
          ...get().nodes.filter((nd) => !childrenIds.includes(nd.id)),
          updatedNode,
          ...childrenNodes,
        ]);
        childrenNodes.forEach((nd) => get().updateParenting(nd));
      } else if (!get().nodes.some((nd) => nd.id === updatedNode.id))
        get().setNodes([...get().nodes, updatedNode]);
    };

    updateParent();
  },
  parentInFront(parentId: string, childId: string) {
    let parentIndex = -1;
    let childIndex = -1;
    get().nodes.forEach((nd, i) => {
      parentIndex = nd.id === parentId ? i : parentIndex;
      childIndex = nd.id === childId ? i : childIndex;
    });

    return parentIndex < childIndex;
  },
  /* ----------------------------------------- */

  /* ------------------ IDS ------------------ */
  nextNodeId: [3],
  nextGroupId: [0],
  nextSubprocessId: [0],
  setIds(nodeId: number[], groupId: number[], subprocessId: number[]) {
    set({
      nextNodeId: nodeId,
      nextGroupId: groupId,
      nextSubprocessId: subprocessId,
    });
  },
  /* ----------------------------------------- */

  /* -------------- EVENT TYPE --------------- */
  eventType: "",
  setEventType(type: string) {
    set({
      eventType: type,
    });
  },
  /* ----------------------------------------- */

  /* ------------- SUBGRAPH TYPE ------------- */
  subgraphType: "",
  setSubgraphType(type: string) {
    set({
      subgraphType: type,
    });
  },
  /* ----------------------------------------- */

  /* ------------- FLOW RELATED -------------- */
  async changeNodes(previous?: string, role?: string) {
    if (previous) {
      const nodes = get().nodes;
      const edges = get().edges;
      get().setProjectionInfo(previous, { nodes, edges });
    }

    await delay(10);

    const projection = role
      ? get().projectionInfo.get(role)
      : get().projectionInfo.get("global");
    if (projection) {
      get().setCurrentProjection(role ? role : "");
      get().setNodes(projection.nodes);
      get().setEdges(projection.edges);
    }
  },
  onNodesChange(changes: NodeChange[]) {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });

    const childrenChanges: NodeChange[] = [];

    changes.forEach((change) => {
      if (change.type === "position") {
        const node = get().getNode(change.id);
        if (node.type === "nest" || node.type === "subprocess") {
          const children = get().nodes.filter(
            (nd) => nd.parentId && nd.parentId === node.id
          );
          if (children.length > 0) {
            children.forEach((child) => {
              childrenChanges.push({
                id: child.id,
                type: "position",
                dragging: true,
                position: child.position,
              });
            });
          }
        }
        const edgesUpdate = async () => {
          get().edges.forEach((e) => {
            if (e.source === change.id || e.target === change.id) {
              const toAdd = get().deleteEdge(e.id);
              if (toAdd) set({ edgeToAdd: [...get().edgeToAdd, toAdd] });
            }
          });

          await delay(10);

          set({
            edges: [...get().edges, ...get().edgeToAdd],
            edgeToAdd: [],
          });
        };

        edgesUpdate();
      }
    });

    if (childrenChanges.length > 0) get().onNodesChange(childrenChanges);

    const selectedNode = get().selectedElement;
    if (selectedNode && isNode(selectedNode)) {
      get().setSelectedElement(get().getNode(selectedNode.id));
    }
  },
  onNodesDelete(deletedNodes: Node[]) {
    get().log(
      `Deleted nodes: ${deletedNodes.map((node) => node.id).join(", ")}.`
    );

    deletedNodes.forEach((nd) => get().removeDocumentation(nd.id));
    set({
      nodes: get().nodes.filter((node) => {
        return !deletedNodes.some((deletedNode) => deletedNode.id === node.id);
      }),
      edges: get().edges.filter((edge) => {
        return !deletedNodes.some(
          (deletedNode) =>
            deletedNode.id === edge.source || deletedNode.id === edge.target
        );
      }),
      nextNodeId: [
        ...deletedNodes
          .filter((node) => node.type !== "nest" && node.type !== "subprocess")
          .map((node) => parseInt(node.id.slice(1))),
        ...get().nextNodeId,
      ].sort((a, b) => a - b),
      nextGroupId: [
        ...deletedNodes
          .filter((node) => node.type === "nest")
          .map((node) => parseInt(node.id.slice(1))),
        ...get().nextGroupId,
      ].sort((a, b) => a - b),
      nextSubprocessId: [
        ...deletedNodes
          .filter((node) => node.type === "subprocess")
          .map((node) => parseInt(node.id.slice(1))),
        ...get().nextSubprocessId,
      ].sort((a, b) => a - b),
      selectedElement: undefined,
    });
  },
  onNodeClick(event: any, node: Node) {
    event.preventDefault();
    get().setSelectedElement(node);
  },
  onNodeDoubleClick(event: any, node: Node) {
    event.preventDefault();

    if (event.shiftKey) {
      const type = get().relationType;
      if (type !== "exclude") return;

      get().log(`Added self-exclusion edge to node ${node.id}`);

      const edge: Edge = {
        id: "se-" + node.id,
        type,
        source: node.id,
        target: node.id,
        zIndex: 200000,
        data: {
          guard: "",
        },
      };

      get().addEdge(edge);
    } else {
      get().setSelectedElement(node);
      get().setDrawerSelectedLogs(false);
      get().setDrawerSelectedCode(false);
      get().setDrawerWidth("25%");
      get().setDrawerOpen(true);
    }
  },
  onNodeDragStart(event: any, node: Node) {
    event.preventDefault();
    set({ selectedElement: node });
  },
  onNodeDragStop(event: any, _: Node) {
    event.preventDefault();
  },
  onDragOver(event: any) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  },
  onDrop(event: any, screenToFlowPosition: any) {
    event.preventDefault();

    const eventType = get().eventType;
    const subgraphType = get().subgraphType;
    if (!eventType && !subgraphType) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    if (eventType) {
      const node: Node = {
        id: "",
        type: "event",
        data: {
          initiators: [],
          receivers: [],
          type: eventType,
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
    } else if (subgraphType) {
      const subgraph: Node = {
        id: "",
        type: subgraphType,
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

      get().addNode(subgraph);
      get().setSubgraphType("");
    }
  },
  /* ----------------------------------------- */
});

export default nodesStateSlice;
