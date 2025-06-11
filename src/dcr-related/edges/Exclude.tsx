import BaseRelation, { RelationProperties } from "./BaseRelation";

const EXCLUDE_COLOR = "#FF0000";

/**
 * SVG icon for a exclude model.
 * @returns A React component that renders a exclude model icon.
 */
export const ExcludeModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={EXCLUDE_COLOR} strokeWidth="2" />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={EXCLUDE_COLOR} />
      <text x="19" y="8" fontSize="9px" fontWeight="bold" fill={EXCLUDE_COLOR}>
        %
      </text>
    </svg>
  );
};

/**
 * Exclude relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a exclude relation.
 */
export default function Exclude(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="exclude-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="20"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -2 0 L 8 5 L -2 10 Z" fill={EXCLUDE_COLOR} />
          <text
            x="8"
            y="8"
            fontSize="9px"
            fontWeight="bold"
            fill={EXCLUDE_COLOR}
          >
            %
          </text>
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerEnd="url(#exclude-markerEnd)"
        style={{ stroke: EXCLUDE_COLOR }}
      />
    </>
  );
}
