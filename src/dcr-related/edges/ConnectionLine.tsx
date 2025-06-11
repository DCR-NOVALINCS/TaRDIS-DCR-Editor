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
 * Custom connection line component for rendering different types of relations.
 * @param props - The properties of the connection line component.
 * @returns A React component that renders a custom connection line based on the relation type.

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
