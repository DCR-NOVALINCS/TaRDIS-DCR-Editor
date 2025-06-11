import BaseRelation, { RelationProperties } from "./BaseRelation";

const INCLUDE_COLOR = "#4DA850";

/**
 * SVG icon for a include model.
 * @returns A React component that renders a include model icon.
 */
export const IncludeModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={INCLUDE_COLOR} strokeWidth="2" />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={INCLUDE_COLOR} />
      <text
        x="18.5"
        y="8.95"
        fontSize="14px"
        fontWeight="bold"
        fill={INCLUDE_COLOR}
      >
        +
      </text>
    </svg>
  );
};

/**
 * Include relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a include relation.
 */
export default function Include(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="include-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="20"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -2 0 L 8 5 L -2 10 Z" fill={INCLUDE_COLOR} />
          <text
            x="7"
            y="8.8"
            fontSize="14px"
            fontWeight="bold"
            fill={INCLUDE_COLOR}
          >
            +
          </text>
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerEnd="url(#include-markerEnd)"
        style={{ stroke: INCLUDE_COLOR }}
      />
    </>
  );
}
