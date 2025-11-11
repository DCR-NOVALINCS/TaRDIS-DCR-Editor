import BaseRelation, { RelationProperties } from "./BaseRelation";

const EXCLUDE_COLOR = "#FF0000";

/**
 * SVG icon for a exclude model.
 *
 * @component
 * @returns a React component that renders a exclude model icon.
 */
export const ExcludeModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={EXCLUDE_COLOR} strokeWidth="2" />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={EXCLUDE_COLOR} />
      <text
        x="19"
        y="8"
        fontSize="9px"
        fontWeight="bold"
        fill={EXCLUDE_COLOR}
        className="select-none"
      >
        %
      </text>
    </svg>
  );
};

/**
 * Self exclude relation component with alternative marker.
 *
 * @param relationProps - the properties of the relation.
 *
 * @component
 * @returns a React component that renders a self exclude relation.
 */
export function SelfNewExclude(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="exclude-markerStart"
          viewBox="0 0 10 10"
          refX="13"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <rect
            x="3"
            y="0"
            width="10"
            height="10"
            rx="1"
            ry="1"
            fill={EXCLUDE_COLOR}
          />
          <text
            x="10"
            y="2.3"
            fontSize="10"
            fill="white"
            stroke="white"
            strokeWidth={0.1}
            rotate={180}
          >
            -
          </text>
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerStart="url(#exclude-markerStart)"
        style={{ stroke: EXCLUDE_COLOR }}
      />
    </>
  );
}

/**
 * Exclude relation component with alternative marker.
 *
 * @param relationProps - the properties of the relation.
 *
 * @component
 * @returns a React component that renders a exclude relation.
 */
export function NewExclude(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="exclude-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -1 4 L 16 4 L 16 6 L -1 6 Z" fill={EXCLUDE_COLOR} />
        </marker>
        <marker
          id="exclude-markerStart"
          viewBox="0 0 10 10"
          refX="13"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <rect
            x="3"
            y="0"
            width="10"
            height="10"
            rx="1"
            ry="1"
            fill={EXCLUDE_COLOR}
          />
          <text
            x="10"
            y="2.3"
            fontSize="10"
            fill="white"
            stroke="white"
            strokeWidth={0.1}
            rotate={180}
          >
            -
          </text>
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerStart="url(#exclude-markerStart)"
        markerEnd="url(#exclude-markerEnd)"
        style={{ stroke: EXCLUDE_COLOR }}
      />
    </>
  );
}

/**
 * Exclude relation component.
 *
 * @param relationProps - the properties of the relation.
 *
 * @component
 * @returns a React component that renders a exclude relation.
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
