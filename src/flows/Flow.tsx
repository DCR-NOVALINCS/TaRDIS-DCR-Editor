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
import useStore, { RFState } from "../stores/store";
import { useEffect, useRef, useState } from "react";
import Condition, { NewCondition } from "../dcr-related/edges/Condition";
import Response, { NewResponse } from "../dcr-related/edges/Response";
import Include, { NewInclude } from "../dcr-related/edges/Include";
import Exclude, { NewExclude } from "../dcr-related/edges/Exclude";
import Milestone, { NewMilestone } from "../dcr-related/edges/Milestone";
import Spawn, { NewSpawn } from "../dcr-related/edges/Spawn";
import CustomConnectionLine from "../dcr-related/edges/ConnectionLine";
import BaseEvent from "../dcr-related/nodes/BaseEvent";
import Nest from "../dcr-related/nodes/Nest";
import Subprocess from "../dcr-related/nodes/Subprocess";
import { Button } from "../lib/reusable-comps";
import Drawer from "../components/drawer";
import ToolPallete from "../components/tool-pallete";
import { Pickaxe } from "lucide-react";
import ImportButton from "../components/import-button";
import ExportButton from "../components/export-button";

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
  setNodes: state.setNodes,
  addNode: state.addNode,
  setEdges: state.setEdges,
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
  onClickSimulationToggle: state.onClickSimulationToggle,
  currentProjection: state.currentProjection,
  edgesTypes: state.edgesTypes,
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

const newEdgeTypes = {
  condition: NewCondition,
  response: NewResponse,
  include: NewInclude,
  exclude: NewExclude,
  milestone: NewMilestone,
  spawn: NewSpawn,
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
    currentProjection,
    edgesTypes,
  } = useStore(selector, shallow);

  const flowRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const [history, setHistory] = useState<History>({
    nodes,
    edges,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
  });
  const [toCopyNodes, setToCopyNodes] = useState<Node[]>([]);
  const [keyPressOn, setKeyPressOn] = useState(true);

  /**
   * Key press listener component to handle keyboard shortcuts.
   *
   * @component
   * @returns a react component that listens for key presses and performs actions accordingly.
   */
  const KeyPressListener = () => {
    useEffect(() => {
      /**
       * Handles key down events for keyboard shortcuts.
       *
       * @param event - the keyboard event.
       */
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey) {
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

      /**
       * Handles key up events for keyboard shortcuts.
       *
       * @param event - the keyboard event.
       */
      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.ctrlKey) {
          event.preventDefault();
          switch (event.key.toLowerCase()) {
            case "z":
              setNodes(history.nodes);
              setEdges(history.edges);
              setIds({
                nextNodeId: history.nextNodeId,
                nextGroupId: history.nextGroupId,
                nextSubprocessId: history.nextSubprocessId,
              });
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

  const reactFlow = useReactFlow();

  useEffect(() => {
    const fitViewTimeout = setTimeout(() => {
      reactFlow.fitView({ maxZoom: 1 });
    }, 10);
    return () => clearTimeout(fitViewTimeout);
  }, [currentProjection]);

  return (
    <ReactFlow
      ref={flowRef}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgesTypes === "old" ? edgeTypes : newEdgeTypes}
      nodeOrigin={nodeOrigin}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onNodesDelete={onNodesDelete}
      onEdgesChange={onEdgesChange}
      onEdgeClick={onEdgeClick}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onEdgesDelete={onEdgesDelete}
      onDragOver={onDragOver}
      onDrop={(event: any) => onDrop(event, screenToFlowPosition)}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      connectionLineComponent={CustomConnectionLine}
      connectionLineContainerStyle={{ zIndex: 20000 }}
      selectNodesOnDrag={true}
      snapToGrid={true}
      fitView={true}
      fitViewOptions={{ maxZoom: 1 }}
      maxZoom={5}
      minZoom={0}
      zoomOnDoubleClick={false}
      nodesDraggable={true}
      nodesConnectable={true}
      elevateNodesOnSelect={false}
      onPaneMouseEnter={() => setKeyPressOn(true)}
      onPaneMouseLeave={() => setKeyPressOn(false)}
      deleteKeyCode={["Backspace", "Delete"]}
      className="select-none"
    >
      {keyPressOn && <KeyPressListener />}
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} />
      {currentProjection === "global" && <ToolPallete />}
      <Drawer />
      <Panel
        position="top-left"
        style={{
          display: "flex",
          width: currentProjection === "global" ? "450px" : "296px",
          gap: 10,
          zIndex: 10,
        }}
      >
        <Button
          className={`flex items-center text-sm justify-center gap-2 w-full`}
          onClick={onClickSimulationToggle}
        >
          Start Simulation
          <Pickaxe size={18} />
        </Button>
        {currentProjection === "global" && (
          <>
            <ImportButton reactFlow={reactFlow} />
          </>
        )}
        <ExportButton />
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
