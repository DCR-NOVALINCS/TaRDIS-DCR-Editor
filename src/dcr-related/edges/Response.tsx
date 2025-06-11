import BaseRelation, { RelationProperties } from "./BaseRelation";

const RESPONSE_COLOR = "#007FFF";

/**
 * SVG icon for a response model.
 * @returns A React component that renders a response model icon.
 */
export const ResponseModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M 0 5 L 17 5" stroke={RESPONSE_COLOR} strokeWidth="2" />
      <path d="M 17 0 L 27 5 L 17 10 Z" fill={RESPONSE_COLOR} />
      <circle cx="1" cy="5" r="4" fill={RESPONSE_COLOR} />
    </svg>
  );
};

/**
 * Response relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a response relation.
 */
export default function Response(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="response-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -1 4 L 10 4 L 10 6 L -1 6 Z" fill={RESPONSE_COLOR} />
          <path d="M 6 0 L 16 5 L 6 10 Z" fill={RESPONSE_COLOR} />
        </marker>
        <marker
          id="response-markerStart"
          viewBox="0 0 10 10"
          refX="13"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <circle cx="9" cy="5" r="4" fill={RESPONSE_COLOR} />
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerStart="url(#response-markerStart)"
        markerEnd="url(#response-markerEnd)"
        style={{ stroke: RESPONSE_COLOR }}
      />
    </>
  );
}
