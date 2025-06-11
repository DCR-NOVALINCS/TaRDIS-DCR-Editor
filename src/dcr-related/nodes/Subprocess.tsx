import {
  NodeProps,
  NodeResizer,
  Handle,
  Position,
  useConnection,
} from "@xyflow/react";

import "@/dcr-related/CustomHandles.css";
import { BaseNode } from "@/components/base-node";

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
        className="h-[100px] w-[100px] border-black border-1 border-dashed"
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
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id != props.id;

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

        {/* HANDLES */}
        {!connection.inProgress && (
          <Handle
            id={`${props.id}-source-handle`}
            className="nestHandle"
            position={Position.Right}
            type="source"
          />
        )}

        {(!connection.inProgress || isTarget) && (
          <Handle
            id={`${props.id}-target-handle`}
            className="nestHandle"
            position={Position.Left}
            type="target"
            isConnectableStart={false}
          />
        )}
      </BaseNode>
    </>
  );
}
