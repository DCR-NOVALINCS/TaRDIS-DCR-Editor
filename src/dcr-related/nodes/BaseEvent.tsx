import { BaseNode } from "@/components/base-node";
import { Handle, NodeProps, Position, useConnection } from "@xyflow/react";
import { Check } from "lucide-react";

import "@/dcr-related/CustomHandles.css";
import useStore, { RFState } from "@/stores/store";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

export const EventModel = ({
  onDragStart,
  onDragEnd,
  type,
}: {
  onDragStart: any;
  onDragEnd: any;
  type: string;
}) => {
  return (
    <>
      {/* EVENT MODEL */}
      <div
        className="h-[100px] w-[100px] border-2 border-[#CCCCCC] bg-[#FFF9DD] rounded-[4px] text-[10px] text-black"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        draggable
      >
        <div className="flex w-full h-[25px] justify-center items-center border-b-2 border-[#CCCCCC] font-bold">
          Initiators
        </div>
        <div className="h-[calc(100%-50px)] w-full flex flex-col gap-3">
          <div className="px-[2px]">{type}</div>
          <div className="text-center">Label: Event</div>
        </div>
      </div>
    </>
  );
};

/**
 * `BaseEvent` component that represents a base event in a diagram.
 * It is a wrapper around the [`BaseNode`](../../components/base-node.tsx) component and includes handles for connections.
 * @param props - The properties for the `BaseEvent` component.
 * @returns JSX element representing the `BaseEvent`.
 */
export default function BaseEvent({ id, data, ...props }: NodeProps) {
  const { simulationFlow } = useStore(selector);
  const { initiators, receivers, type, label, name, marking } = data as {
    initiators: string[];
    receivers: string[];
    type: string;
    label: string;
    name: string;
    marking: Record<string, boolean>;
  };

  const { included, pending, executable, executed } = marking as Record<
    string,
    boolean
  >;

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id != id;

  const borderDashed = included ? "" : "border-dashed";
  const borderColor =
    simulationFlow && executable ? "border-[#00FF00]" : "border-[#CCCCCC]";

  const initiatorsJoined = initiators.join(", ");
  const receiversJoined = receivers.join(", ");

  return (
    <>
      {/* BASE EVENT */}
      <BaseNode
        {...props}
        className={`flex flex-col h-[100px] w-[100px] border-2 ${borderColor} ${borderDashed} bg-[#FFF9DD] rounded-[4px] text-[10px] text-black relative`}
        draggable={false}
      >
        {/* INITIATOR */}
        <div
          className={`flex absolute top-0 left-0 w-full h-[25px] border-b-2  ${borderColor} ${borderDashed} font-bold justify-center items-center`}
        >
          {initiatorsJoined.length > 11
            ? initiatorsJoined.slice(0, 10) + "..."
            : initiatorsJoined}
        </div>

        <div
          className={`absolute flex ${
            receiversJoined
              ? "h-[calc(100%-50px)] gap-1 bottom-[25px]"
              : "h-[calc(100%-25px)] gap-3 bottom-0"
          } w-full right-0 flex-col`}
        >
          {/* EVENT TYPE */}
          <div className="px-[2px]">{type as string}</div>

          {/* EVENT PENDING STATE */}
          <div className="absolute px-[4px] right-0 items-center flex gap-1">
            {pending && <div className="font-bold text-blue-700">!</div>}
            {simulationFlow && executed && (
              <Check className="text-[#00FF00]" size={12} />
            )}
          </div>

          {/* EVENT LABEL PLUS NAME */}
          <div className="text-center">{label + ": " + name}</div>
        </div>

        {/* RECEIVERS */}
        {receiversJoined && (
          <div
            className={`flex absolute bottom-0 left-0 w-full h-[25px] border-t-2 ${borderColor} ${borderDashed} font-bold justify-center items-center bg-[#999999] rounded-br-[2px] rounded-bl-[2px]`}
          >
            {receiversJoined.length > 11
              ? receiversJoined.slice(0, 10) + "..."
              : receiversJoined}
          </div>
        )}

        {/* CHILDREN */}

        {/* HANDLES */}
        {!connection.inProgress && (
          <Handle
            id={`${id}-source-handle`}
            className="customHandle"
            position={Position.Right}
            type="source"
            isConnectable={!simulationFlow}
          />
        )}

        {(!connection.inProgress || isTarget) && (
          <Handle
            id={`${id}-target-handle`}
            className="customHandle"
            position={Position.Left}
            type="target"
            isConnectableStart={false}
            isConnectable={!simulationFlow}
          />
        )}
      </BaseNode>
    </>
  );
}
