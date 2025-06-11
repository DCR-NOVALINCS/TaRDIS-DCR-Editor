import {
  NodeProps,
  NodeResizer,
  Handle,
  Position,
  useConnection,
} from "@xyflow/react";

import "@/dcr-related/CustomHandles.css";
import { BaseNode } from "@/components/base-node";

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
 * Subprocess node component similar to a [`Nest`](./Nest.tsx) node.
 * Should be instantiated with a [spawn](../relations/Spawn.tsx) relation (if multiple).
 * @param props - The props for the `Subprocess` component.
 * @returns JSX element representing the `Subprocess` component.
 * @todo this is a temporary subprocess node, it should be replaced with a proper subprocess node in the future.
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
