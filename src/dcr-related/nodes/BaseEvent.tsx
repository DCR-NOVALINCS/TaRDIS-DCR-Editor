import { BaseNode } from "@/components/base-node";
import { Handle, NodeProps, Position, useConnection } from "@xyflow/react";
import { Check } from "lucide-react";

import "@/dcr-related/CustomHandles.css";
import useStore, { RFState } from "@/stores/store";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

/**
 * Renders a draggable event model component for DCR graphs.
 *
 * @param onDragStart - Callback function triggered when the drag starts.
 * @param onDragEnd - Callback function triggered when the drag ends.
 * @param type - The type of the event to display in the model.
 * @returns A JSX element representing the event model.
 */
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
        className="h-[100px] w-[100px] border-2 border-[#CCCCCC] bg-[#FFF9DD] rounded-[4px] text-[10px] text-black select-none"
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
 * Renders a DCR (Dynamic Condition Response) Event node component.
 *
 * This component displays the event's initiators, receivers, type, label, name, and marking state.
 * It visually indicates the event's inclusion, pending, executable, and executed states,
 * and adapts its appearance based on simulation flow and connection status.
 *
 * @param id - The unique identifier for the node.
 * @param data - The event data, including initiators, receivers, type, label, name, and marking.
 * @param props - Additional props passed to the BaseNode component.
 *
 * @remarks
 * - The border color and style reflect the event's inclusion and executability.
 * - Initiators and receivers are truncated if their string representation exceeds 11 characters.
 * - Handles are conditionally rendered based on connection and simulation state.
 * - Marking state controls the display of pending and excluded indicators.
 */
export default function BaseEvent({ id, data, ...props }: NodeProps) {
  const { simulationFlow } = useStore(selector);
  const { initiators, receivers, type, label, name, marking, interactionType } =
    data as {
      initiators: string[];
      receivers: string[];
      type: string;
      label: string;
      name: string;
      marking: Record<string, boolean>;
      interactionType?: string;
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
  const receiversJoined = receivers ? receivers.join(", ") : "";

  const labelName = label + ": " + name;
  const fixedLabelName =
    labelName.length > 20 ? labelName.slice(0, 19) + "..." : labelName;

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
              ? "h-[calc(100%-50px)] gap-[0.5px] bottom-[25px]"
              : "h-[calc(100%-25px)] gap-3 bottom-0"
          } w-full right-0 flex-col`}
        >
          {/* EVENT TYPE */}

          <div className="px-[2px] ">{type as string}</div>

          {/* EVENT PENDING STATE */}
          <div className="absolute px-[4px] right-0 items-center flex gap-1">
            {pending && <div className="font-bold text-blue-700">!</div>}
            {simulationFlow && executed && (
              <Check className="text-[#00FF00]" size={12} />
            )}
          </div>

          {/* EVENT LABEL PLUS NAME */}
          <div className="text-center">{fixedLabelName}</div>
          {receiversJoined && (
            <div className="absolute bottom-[0.5px] right-1">
              {interactionType ? interactionType : "rxtx"}
            </div>
          )}
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
