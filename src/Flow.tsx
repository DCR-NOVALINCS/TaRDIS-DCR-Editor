import {
  ReactFlow,
  Controls,
  Background,
  NodeOrigin,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  type Node,
  Panel,
  Edge,
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

type History = {
  nodes: Node[];
  edges: Edge[];
  nextNodeId: number[];
  nextGroupId: number[];
  nextSubprocessId: number[];
  history?: History;
};

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  nextNodeId: state.nextNodeId,
  nextGroupId: state.nextGroupId,
  nextSubprocessId: state.nextSubprocessId,
  setIds: state.setIds,
  simulationFlow: state.simulationFlow,
  setNodes: state.setNodes,
  addNode: state.addNode,
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
  onEdgeDoubleClick: state.onEdgeDoubleClick,
  onDragOver: state.onDragOver,
  onDrop: state.onDrop,
  onConnect: state.onConnect,
  onPaneClick: state.onPaneClick,
  onEdgesDelete: state.onEdgesDelete,
  simNodes: state.simNodes,
  simEdges: state.simEdges,
  onClickSimulationToggle: state.onClickSimulationToggle,
  onNodeClickSimulation: state.onNodeClickSimulation,
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
    setEdges,
    onNodesChange,
    onNodeClick,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDragStop,
    onNodesDelete,
    onEdgesChange,
    onEdgeClick,
    onEdgeDoubleClick,
    onDragOver,
    onDrop,
    onConnect,
    onPaneClick,
    onEdgesDelete,
    onClickSimulationToggle,
    onNodeClickSimulation,
    simEdges,
    simNodes,
  } = useStore(selector, shallow);

  const flowRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const simulationProps = {
    ref: flowRef,
    nodes: simNodes,
    edges: simEdges,
    edgeTypes,
    nodeTypes,
    nodeOrigin,
    nodesDraggable: false,
    nodesConnectable: false,
    onNodeClick: onNodeClickSimulation,
    fitView: true,
    maxZoom: 5,
    minZoom: 0,
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
    onEdgeDoubleClick,
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
    minZoom: 0,
    zoomOnDoubleClick: false,
  };

  const [history, setHistory] = useState<History>({
    nodes,
    edges,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
  });
  const [toCopyNodes, setToCopyNodes] = useState<Node[]>([]);
  const [keyPressOn, setKeyPressOn] = useState(true);

  const KeyPressListener = () => {
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && keyPressOn) {
          event.preventDefault();
          switch (event.key.toLowerCase()) {
            case "s":
              setHistory((prev) => ({
                nodes,
                edges,
                nextNodeId,
                nextGroupId,
                nextSubprocessId,
                history: prev,
              }));
              break;
            case "c":
              setToCopyNodes(nodes.filter((nd) => nd.selected));
              break;
            case "v":
              toCopyNodes.forEach((nd) => {
                addNode({
                  ...nd,
                  id: "",
                  data: {
                    ...nd.data,
                    label: "",
                  },
                  position: { x: nd.position.x + 10, y: nd.position.y + 10 },
                });
              });
              break;
            case "z":
              setNodes([]);
              break;
          }
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.ctrlKey && keyPressOn) {
          event.preventDefault();
          switch (event.key.toLowerCase()) {
            case "z":
              setNodes(history.nodes);
              setEdges(history.edges);
              setIds(
                history.nextNodeId,
                history.nextGroupId,
                history.nextSubprocessId
              );
              if (history.history) setHistory(history.history);
              break;
          }
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
      onPaneMouseEnter={() => {
        setKeyPressOn(true);
      }}
      onPaneMouseLeave={() => {
        setKeyPressOn(false);
      }}
      className="select-none"
    >
      <KeyPressListener />
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} />
      <Panel position="top-left" style={{ zIndex: 20000 }}>
        <JsonDownload />
        <PngDownload />
        <button
          className="bg-black select-none text-white font-semibold px-2 py-1 w-36 rounded-sm m-2 hover:opacity-75 cursor-pointer"
          onClick={onClickSimulationToggle}
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
