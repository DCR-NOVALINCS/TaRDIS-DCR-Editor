import {
  NodeProps,
  NodeResizer,
  Handle,
  Position,
  useConnection,
} from "@xyflow/react";

import "@/dcr-related/CustomHandles.css";

/**
 * A draggable React component representing a Nest node.
 *
 * @param onDragStart - Callback function triggered when the drag operation starts.
 * @param onDragEnd - Callback function triggered when the drag operation ends.
 * @returns A styled div element that can be dragged, displaying a bold "n" label.
 */
export const NestModel = ({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: any;
  onDragEnd: any;
}) => {
  return (
    <div
      className="h-[100px] w-[100px] border-black border-1 border-dashed select-none"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      draggable
    >
      <div className="flex p-1 mt-[-8px] font-bold">n</div>
    </div>
  );
};

/**
 * Renders a DCR Nest node component with resizable borders, label, algorithm type indicator,
 * and connection handles for use in a flow-based editor.
 *
 * @param props - The properties for the Nest node, including node data, selection state, and node ID.
 * @returns A React component representing the Nest node with visual indicators for type and pending state.
 *
 * @remarks
 * - Displays a resizer when the node is selected.
 * - Shows a label and icons for the nest algorithm type ("choice") and pending state.
 * - Renders connection handles for source and target edges, with conditional visibility based on connection state.
 */
export default function Nest(props: NodeProps) {
  const { nestType } = props.data;
  const { pending } = props.data.marking as Record<string, boolean>;

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id != props.id;

  return (
    <>
      {/* NEST */}
      <div
        className={`relative w-full h-full border-dashed border-1 border-black`}
      >
        {/* NEST NODE RESIZER */}
        <NodeResizer
          color="#000000"
          isVisible={props.selected}
          nodeId={props.id as string}
        />

        {/* NEST LABEL */}
        <div className={`flex absolute top-0 left-0 px-2 py-1`}>
          {props.data.label as string}
        </div>

        {/* NEST ALGORITHM TYPE AND PENDING STATE */}
        <div className="absolute px-[4px] right-0 flex gap-1 font-bold ">
          {(nestType as string) === "choice" && (
            <div className="text-red-700">%</div>
          )}
          {pending && <div className="text-blue-700">!</div>}
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
      </div>
    </>
  );
}
