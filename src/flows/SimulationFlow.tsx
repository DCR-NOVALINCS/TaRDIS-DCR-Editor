import {
  Background,
  BackgroundVariant,
  Controls,
  EdgeTypes,
  NodeOrigin,
  NodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useRef } from "react";
import useStore, { RFState } from "../stores/store";
import { shallow } from "zustand/shallow";
import { Button } from "../lib/reusable-comps";
import { Pickaxe } from "lucide-react";
import Condition from "../dcr-related/edges/Condition";
import Exclude from "../dcr-related/edges/Exclude";
import Include from "../dcr-related/edges/Include";
import Milestone from "../dcr-related/edges/Milestone";
import Response from "../dcr-related/edges/Response";
import Spawn from "../dcr-related/edges/Spawn";
import BaseEvent from "@/dcr-related/nodes/BaseEvent";
import Nest from "@/dcr-related/nodes/Nest";
import Subprocess from "@/dcr-related/nodes/Subprocess";

const selector = (state: RFState) => ({
  nodes: state.simNodes,
  edges: state.edges,
  onNodeClick: state.onNodeClickSimulation,
  onClickSimulationToggle: state.onClickSimulationToggle,
});

const nodeOrigin: NodeOrigin = [0.5, 0.5];

const edgeTypes: EdgeTypes = {
  condition: Condition,
  response: Response,
  include: Include,
  exclude: Exclude,
  milestone: Milestone,
  spawn: Spawn,
};

const nodeTypes: NodeTypes = {
  event: BaseEvent,
  nest: Nest,
  subprocess: Subprocess,
};

function SimulationFlowWithoutProvider() {
  const { nodes, edges, onNodeClick, onClickSimulationToggle } = useStore(
    selector,
    shallow
  );

  const flowRef = useRef<HTMLDivElement>(null);

  return (
    <ReactFlow
      ref={flowRef}
      nodes={nodes}
      edges={edges}
      edgeTypes={edgeTypes}
      nodeTypes={nodeTypes}
      nodeOrigin={nodeOrigin}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView={true}
      fitViewOptions={{ maxZoom: 1 }}
      maxZoom={5}
      minZoom={0}
      zoomOnDoubleClick={false}
      elementsSelectable={false}
    >
      <Controls showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} />
      <Panel position="top-left" style={{ width: "193px" }}>
        <Button
          className="flex items-center justify-center gap-2 w-full"
          onClick={onClickSimulationToggle}
        >
          Stop Simulation
          <Pickaxe size={20} />
        </Button>
      </Panel>
    </ReactFlow>
  );
}

export default function SimulationFlow() {
  return (
    <ReactFlowProvider>
      <SimulationFlowWithoutProvider />
    </ReactFlowProvider>
  );
}
