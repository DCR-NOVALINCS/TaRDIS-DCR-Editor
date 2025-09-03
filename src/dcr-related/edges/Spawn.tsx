import BaseRelation, { RelationProperties } from "./BaseRelation";

const SPAWN_COLOR = "#6255AC";

/**
 * SVG icon for a spawn model.
 * @returns A React component that renders a spawn model icon.
 */
export const SpawnModel = () => {
  return (
    <svg width="40" height="20" viewBox="-3 0 30 10">
      <path d="M -5 5 L 12 5" stroke={SPAWN_COLOR} strokeWidth="2" />
      <path d="M 17 0 L 27 5 L 17 10 Z" fill={SPAWN_COLOR} />
      <path d="M 10 0 L 20 5 L 10 10 Z" fill={SPAWN_COLOR} />
    </svg>
  );
};

/**
 * Spawn relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a spawn relation.
 */
export function NewSpawn(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="spawn-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -1 4 L 16 4 L 16 6 L -1 6 Z" fill={SPAWN_COLOR} />
        </marker>
        <marker
          id="spawn-markerStart"
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
            fill={SPAWN_COLOR}
          />
          <text
            x="10"
            y="0"
            fontSize="10"
            fill="white"
            stroke="white"
            strokeWidth={0.1}
            rotate={180}
          >
            *
          </text>
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerStart="url(#spawn-markerStart)"
        markerEnd="url(#spawn-markerEnd)"
        style={{ stroke: SPAWN_COLOR }}
      />
    </>
  );
}

/**
 * Spawn relation component.
 * @param relationProps - The properties of the relation.
 * @returns A React component that renders a spawn relation.
 */
export default function Spawn(relationProps: RelationProperties) {
  return (
    <>
      <defs>
        <marker
          id="spawn-markerEnd"
          viewBox="0 0 10 10"
          refX="0"
          refY="5"
          markerWidth="15"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M -2 0 L 8 5 L -2 10 Z" fill={SPAWN_COLOR} />
          <path d="M 6 0 L 16 5 L 6 10 Z" fill={SPAWN_COLOR} />
        </marker>
      </defs>
      <BaseRelation
        {...relationProps}
        markerEnd="url(#spawn-markerEnd)"
        style={{ stroke: SPAWN_COLOR }}
      />
    </>
  );
}
