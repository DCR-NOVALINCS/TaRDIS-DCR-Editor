import BaseRelation, { RelationProperties } from "./BaseRelation";

const CONDITION_COLOR = "#FF8000";

/**
 * SVG icon for a condition model.
 * @returns A React component that renders a condition model icon.
 */
export function ConditionModel() {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={CONDITION_COLOR} strokeWidth="2" />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={CONDITION_COLOR} />
      <circle cx="23" cy="5" r="4" fill={CONDITION_COLOR} />
    </svg>
  );
}

/**
 * Condition relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a condition relation.
 */
export default function Condition(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="condition-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -1 0 L 9 5 L -1 10 Z" fill={CONDITION_COLOR} />
          <circle cx="12" cy="5" r="4" fill={CONDITION_COLOR} />
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerEnd="url(#condition-markerEnd)"
        style={{ stroke: CONDITION_COLOR }}
      />
    </>
  );
}
