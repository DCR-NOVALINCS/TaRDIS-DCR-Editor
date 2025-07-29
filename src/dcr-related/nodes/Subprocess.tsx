import {
  NodeProps,
  NodeResizer,
  Handle,
  Position,
  useConnection,
} from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { useKeyPress } from "@/lib/utils";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

/**
 * Renders a draggable subprocess node component with a dashed border.
 *
 * @param onDragStart - Callback function triggered when the drag starts.
 * @param onDragEnd - Callback function triggered when the drag ends.
 * @returns A JSX element representing the subprocess node.
 */
export const SubprocessModel = ({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: any;
  onDragEnd: any;
}) => {
  return (
    <>
      <div
        className="h-[100px] w-[100px] border-black border-1 border-dashed select-none"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        draggable
      >
        <div className="flex p-1 mt-[-8px] font-bold">s</div>
      </div>
    </>
  );
};

/**
 * Renders a custom DCR Subprocess node component for a flow editor.
 *
 * This component displays a subprocess node with resizable borders, a label, and connection handles.
 * Handles are conditionally rendered based on the current connection state.
 *
 * @param props - The properties for the node, including id, data, and selection state.
 * @returns The rendered Subprocess node component.
 */
export default function Subprocess(props: NodeProps) {
  const { simulationFlow } = useStore(selector, shallow);
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id != props.id;

  const shiftPressed = useKeyPress("Shift");

  const handleStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "black",
    position: "absolute",
    top: "50%",
    left: "50%",
    borderRadius: "0px",
    transform: "translate(-50%, -50%)",
    border: "none",
    opacity: "0",
  };

  return (
    <>
      {/* SUBPROCESS */}
      <BaseNode
        className={`relative w-full h-full border-dashed border-1 rounded-none bg-transparent border-black`}
      >
        {/* SUBPROCESS NODE RESIZER */}
        <NodeResizer
          color="#000000"
          isVisible={props.selected}
          nodeId={props.id as string}
        />

        {/* SUBPROCESS LABEL */}
        <div className={`flex absolute top-0 left-0 px-2 py-1`}>
          {props.data.label as string}
        </div>

        {simulationFlow &&
          !(props.data.marking as Record<string, boolean>).spawned && (
            <div className="flex items-center justify-center mt-[35%] text-4xl">
              ...
            </div>
          )}

        {/* HANDLES */}
        {!connection.inProgress && (
          <Handle
            id={`${props.id}-source-handle`}
            style={handleStyle}
            position={Position.Right}
            type="source"
            isConnectable={!simulationFlow && shiftPressed}
          />
        )}

        {(!connection.inProgress || isTarget) && (
          <Handle
            id={`${props.id}-target-handle`}
            style={handleStyle}
            position={Position.Left}
            type="target"
            isConnectableStart={false}
            isConnectable={!simulationFlow && shiftPressed}
          />
        )}
      </BaseNode>
    </>
  );
}
