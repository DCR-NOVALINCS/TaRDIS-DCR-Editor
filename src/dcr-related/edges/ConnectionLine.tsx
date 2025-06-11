import {
  getStraightPath,
  type ConnectionLineComponentProps,
} from "@xyflow/react";

import Condition from "./Condition";
import Response from "./Response";
import Include from "./Include";
import Exclude from "./Exclude";
import Milestone from "./Milestone";
import Spawn from "./Spawn";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { RelationProperties } from "./BaseRelation";

const selector = (state: RFState) => ({
  relationType: state.relationType,
});

/**
 * Renders a custom connection line between nodes based on the current relation type.
 *
 * This component selects and renders a specific edge component (`Condition`, `Response`, `Include`, `Exclude`, `Milestone`, or `Spawn`)
 * according to the `relationType` value from the store. It computes the edge path using the provided source and target coordinates,
 * and passes all relevant properties to the selected edge component.
 *
 * @param props - The properties required to render the connection line, including node references, positions, and coordinates.
 * @returns The appropriate edge component for the current relation type, or `undefined` if the relation type is not recognized.
 */
export default function CustomConnectionLine(
  props: ConnectionLineComponentProps
) {
  const { relationType } = useStore(selector, shallow);

  const {
    fromNode,
    fromPosition: sourcePosition,
    toPosition: targetPosition,
    fromX: sourceX,
    fromY: sourceY,
    toX: targetX,
    toY: targetY,
  } = props;

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const relationProps: RelationProperties = {
    relationPath: edgePath,
    id: "null",
    source: fromNode.id,
    sourcePosition,
    sourceX,
    sourceY,
    target: "null",
    targetPosition,
    targetX,
    targetY,
  };

  switch (relationType) {
    case "condition":
      return <Condition {...relationProps} />;
    case "response":
      return <Response {...relationProps} />;
    case "include":
      return <Include {...relationProps} />;
    case "exclude":
      return <Exclude {...relationProps} />;
    case "milestone":
      return <Milestone {...relationProps} />;
    case "spawn":
      return <Spawn {...relationProps} />;
  }
}
