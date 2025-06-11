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

import { calcSubgraphArgs, delay } from "@/lib/utils";
import { EventType } from "@/lib/codegen";

export interface Child {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  nodes: [
    {
      id: "e0",
      type: "event",
      data: {
        initiators: ["P(id=1)"],
        receivers: [],
        type: "i",
        label: "e0",
        name: "readDocument",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Record",
          record: [
            { var: "size", type: "Integer" },
            { var: "name", type: "String" },
          ],
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 100, y: 100 },
      zIndex: 10000,
    },
    {
      id: "e1",
      type: "event",
      data: {
        initiators: ["P(id=1)"],
        receivers: ["P(id=2)"],
        type: "i",
        label: "e1",
        name: "submit",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Unit",
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 250, y: 100 },
      zIndex: 10000,
    },
    {
      id: "e2",
      type: "event",
      data: {
        initiators: ["P(id=2)"],
        receivers: ["P(id=1)"],
        type: "i",
        label: "e2",
        name: "accept",
        marking: {
          included: true,
          pending: false,
        },
        input: {
          type: "Unit",
        },
        security: "Public",
      },
      parentId: "",
      position: { x: 400, y: 100 },
      zIndex: 10000,
    },
  ],
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

    const newNodes = get().nodes.map((nd) => ({ ...nd, selected: false }));
    set({
      nodes:
        nodeToAdd.type === "event"
          ? [...newNodes, nodeToAdd]
          : [nodeToAdd, ...newNodes],
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
          } = event;

          return {
            ...nd,
            data: {
              ...nd.data,
              label,
              name,
              security,
              initiators,
              marking,
              ...(receivers && { receivers }),
              ...(input && { input }),
              ...(expression && { expression }),
            },
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
      console.log(get().nodes);

      await delay(10);

      if (updatedNode.type !== "event") {
        const childrenNodes = get().nodes.filter(
          (nd) =>
            nd.parentId &&
            nd.parentId === updatedNode.id &&
            !get().parentInFront(updatedNode.id, nd.id)
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
          children: [],
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
