import BaseRelation, { RelationProperties } from "./BaseRelation";

const MILESTONE_COLOR = "#FF00FF";

/**
 * SVG icon for a milestone model.
 * @returns A React component that renders a milestone model icon.
 */
export const MilestoneModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={MILESTONE_COLOR} strokeWidth="2" />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={MILESTONE_COLOR} />
      <path
        d="M 20 5 L 23 8 L 26 5 L 23 2 L 20 5 Z"
        fill="none"
        stroke={MILESTONE_COLOR}
      />
    </svg>
  );
};

/**
 * Milestone relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a milestone relation.
 */
export default function Milestone(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="milestone-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="20"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -1 0 L 9 5 L -1 10 Z" fill={MILESTONE_COLOR} />
          <path
            d="M 9 5 L 12 8 L 15 5 L 12 2 L 9 5 Z"
            fill="none"
            stroke={MILESTONE_COLOR}
            strokeWidth="1"
          />
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerEnd="url(#milestone-markerEnd)"
        style={{ stroke: MILESTONE_COLOR }}
      />
    </>
  );
}
