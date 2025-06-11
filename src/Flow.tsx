import {
  ReactFlow,
  Controls,
  Background,
  NodeOrigin,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { shallow } from "zustand/shallow";

import useStore, { RFState } from "./stores/store";

import { useEffect, useRef, useState } from "react";

import Condition from "./dcr-related/edges/Condition";
import Response from "./dcr-related/edges/Response";
import Include from "./dcr-related/edges/Include";
import Exclude from "./dcr-related/edges/Exclude";
import Milestone from "./dcr-related/edges/Milestone";
import Spawn from "./dcr-related/edges/Spawn";
import CustomConnectionLine from "./dcr-related/edges/ConnectionLine";

import BaseEvent from "./dcr-related/nodes/BaseEvent";
import Nest from "./dcr-related/nodes/Nest";
import Subprocess from "./dcr-related/nodes/Subprocess";

import JsonDownload from "./components/json-download";
import PngDownload from "./components/png-download";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  nextNodeId: state.nextNodeId,
  nextGroupId: state.nextGroupId,
  nextSubprocessId: state.nextSubprocessId,
  setIds: state.setIds,
  log: state.log,
  simulationFlow: state.simulationFlow,
  setNodes: state.setNodes,
  addNode: state.addNode,
  updateNode: state.updateNode,
  getNode: state.getNode,
  setEdges: state.setEdges,
  setSimulationFlow: state.setSimulationFlow,
  onNodesChange: state.onNodesChange,
  onNodeClick: state.onNodeClick,
  onNodeDoubleClick: state.onNodeDoubleClick,
  onNodeDragStart: state.onNodeDragStart,
  onNodeDragStop: state.onNodeDragStop,
  onNodesDelete: state.onNodesDelete,
  onEdgesChange: state.onEdgesChange,
  onEdgeClick: state.onEdgeClick,
  onDragOver: state.onDragOver,
  onDrop: state.onDrop,
  onConnect: state.onConnect,
  onPaneClick: state.onPaneClick,
  setSelectedElement: state.setSelectedElement,
  onEdgesDelete: state.onEdgesDelete,
});

const nodeOrigin: NodeOrigin = [0.5, 0.5];

const edgeTypes = {
  condition: Condition,
  response: Response,
  include: Include,
  exclude: Exclude,
  milestone: Milestone,
  spawn: Spawn,
};

const nodeTypes = {
  event: BaseEvent,
  nest: Nest,
  subprocess: Subprocess,
};

/**
 * `FlowWithoutProvider` component that renders the `ReactFlow` component without the `ReactFlowProvider`.
 * @returns JSX element representing the flow diagram.
 */
function FlowWithoutProvider() {
  const {
    nodes,
    edges,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
    setIds,
    simulationFlow,
    setNodes,
    addNode,
    getNode,
    updateNode,
    setEdges,
    setSimulationFlow,
    onNodesChange,
    onNodeClick,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onNodesDelete,
    onEdgesChange,
    onEdgeClick,
    onDragOver,
    onDrop,
    onConnect,
    onPaneClick,
    onEdgesDelete,
  } = useStore(selector, shallow);

  const flowRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const [nodesTemp, setNodesTemp] = useNodesState(nodes);
  const [edgesTemp, setEdgesTemp] = useEdgesState(edges);

  const onClickSimulationStart = (event: any) => {
    event.preventDefault();
    setSimulationFlow(!simulationFlow);

    if (!simulationFlow) {
      setNodesTemp(() =>
        nodes.map((node) => {
          const marking = node.data.marking as Record<string, boolean>;

          if (!marking) {
            return node;
          } else {
            return {
              ...node,
              data: {
                ...node.data,
                marking: {
                  ...marking,
                  executable:
                    marking.included &&
                    !edges.some(
                      (edge) =>
                        edge.target === node.id &&
                        (edge.type === "condition" || edge.type === "milestone")
                    ),
                  executed: false,
                },
              },
              selected: false,
            };
          }
        })
      );

      setEdgesTemp(() => edges.map((edge) => ({ ...edge, selected: false })));
    } else setNodes(nodes.map((nd) => ({ ...nd, selected: false })));
  };

  const onNodeClickSimulation = (event: any, node: Node) => {
    event.preventDefault();

    if (!(node.data.marking as Record<string, boolean>).executable) {
      return;
    }

    edgesTemp.forEach((edge) => {
      if (edge.source === node.id) {
        setNodesTemp((nds) => {
          return nds.map((n) => {
            const marking = n.data.marking as Record<string, boolean>;
            if (edge.target === n.id) {
              return {
                ...n,
                data: {
                  ...n.data,
                  marking: {
                    included:
                      edge.type === "exclude"
                        ? false
                        : edge.type === "include"
                        ? true
                        : marking.included,
                    pending: edge.type === "response" ? true : marking.pending,
                    executable:
                      edge.type === "condition"
                        ? true
                        : edge.type === "exclude"
                        ? false
                        : edge.type === "include"
                        ? true
                        : marking.executable,
                    executed: marking.executed,
                  },
                },
              };
            } else {
              return n;
            }
          });
        });
      }
      setNodesTemp((nds) => {
        return nds.map((n) => {
          const marking = n.data.marking as Record<string, boolean>;
          if (n.id === node.id) {
            return {
              ...n,
              data: {
                ...n.data,
                marking: {
                  ...marking,
                  executed: true,
                },
              },
            };
          } else {
            return n;
          }
        });
      });
    });
  };

  const simulationProps = {
    ref: flowRef,
    nodes: nodesTemp,
    edges: edgesTemp,
    edgeTypes,
    nodeTypes,
    nodeOrigin,
    nodesDraggable: false,
    nodesConnectable: false,
    onNodeClick: onNodeClickSimulation,
    fitView: true,
    maxZoom: 5,
    minZoom: 1,
    zoomOnDoubleClick: false,
    elementsSelectable: simulationFlow,
  };

  const normalProps = {
    ref: flowRef,
    nodes,
    edges,
    onNodesChange,
    onNodeClick,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onNodesDelete,
    onEdgesChange,
    onEdgeClick,
    onEdgesDelete,
    onDragOver,
    onDrop: (event: any) => onDrop(event, screenToFlowPosition),
    onConnect,
    onPaneClick,
    nodesDraggable: true,
    nodesConnectable: true,
    edgeTypes,
    nodeTypes,
    nodeOrigin,
    connectionLineComponent: CustomConnectionLine,
    connectionLineContainerStyle: { zIndex: 20000 },
    selectNodesOnDrag: true,
    snapToGrid: true,
    fitView: true,
    fitViewOptions: { maxZoom: 1 },
    maxZoom: 5,
    minZoom: 1,
    zoomOnDoubleClick: false,
  };

  const [history, setHistory] = useState({
    nodes,
    edges,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
  });
  const [toCopyNodes, setToCopyNodes] = useState<Node[]>([]);

  const KeyPressListener = () => {
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key.toLowerCase() === "s") {
          event.preventDefault();
          setHistory({
            nodes,
            edges,
            nextNodeId,
            nextGroupId,
            nextSubprocessId,
          });
        }

        if (event.ctrlKey && event.key.toLowerCase() === "c") {
          event.preventDefault();
          setToCopyNodes(nodes.filter((nd) => nd.selected));
        }

        if (event.ctrlKey && event.key.toLowerCase() === "v") {
          event.preventDefault();
          toCopyNodes.forEach((nd) => {
            const { parentId, expandParent, extent, ...rest } = nd;
            addNode({
              ...rest,
              id: "",
              selected: true,
              data: {
                ...nd.data,
                label: "",
              },
              position: { x: nd.position.x + 10, y: nd.position.y + 10 },
              parentId: "",
            });
          });
        }

        if (event.ctrlKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          setEdges([]);
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          setNodes(history.nodes);
          setEdges(history.edges);
          setIds(
            history.nextNodeId,
            history.nextGroupId,
            history.nextSubprocessId
          );
        }

        if (event.ctrlKey && event.key.toLowerCase() === "v") {
          event.preventDefault();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    return null;
  };

  return (
    <ReactFlow
      elevateNodesOnSelect={false}
      {...(simulationFlow ? simulationProps : normalProps)}
    >
      <KeyPressListener />
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Lines} />
      <Panel position="top-left" style={{ zIndex: 20000 }}>
        <JsonDownload />
        <PngDownload />
        <button
          className="bg-black text-white font-semibold px-2 py-1 w-36 rounded-sm m-2 hover:opacity-75 cursor-pointer"
          onClick={onClickSimulationStart}
        >
          {simulationFlow ? "Stop" : "Start"} Simulation
        </button>
      </Panel>
    </ReactFlow>
  );
}

/**
 * `Flow` component that wraps the `FlowWithoutProvider` component with the `ReactFlowProvider`.
 * This component is used to provide the context for the `ReactFlow` component.
 * @returns JSX element representing the flow diagram wrapped in a provider.
 */
export default function Flow() {
  return (
    <ReactFlowProvider>
      <FlowWithoutProvider />
    </ReactFlowProvider>
  );
}
