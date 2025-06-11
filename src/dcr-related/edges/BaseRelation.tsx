import {
  BaseEdge,
  EdgeProps,
  useInternalNode,
  useReactFlow,
} from "@xyflow/react";

import { useRef, useState } from "react";

import { getEdgeParams } from "@/lib/utils";
import useStore, { RFState } from "@/stores/store";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

/**
 * `RelationProperties` type that extends `EdgeProps` with an optional `relationPath` property.
 */
export interface RelationProperties extends EdgeProps {
  relationPath?: string;
}

/**
 * `BaseRelation` component that represents a base relation in a diagram.
 * It is a wrapper around the `BaseEdge` component and includes handles for connections.
 * @param props - The properties for the `BaseRelation` component.
 * @returns JSX element representing the `BaseRelation`.
 */
export default function BaseRelation({
  relationPath,
  ...props
}: RelationProperties) {
  const { simulationFlow } = useStore(selector);
  const { id, source, target, markerStart, markerEnd, selected, style } = props;

  if (relationPath) {
    return (
      <BaseEdge
        {...props}
        id={id}
        path={relationPath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{ strokeWidth: 2, ...style }}
      />
    );
  }

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const {
    sx: sourceX,
    sy: sourceY,
    tx: targetX,
    ty: targetY,
    targetPos,
  } = getEdgeParams(sourceNode, targetNode);

  let initialPoints: { x: number; y: number }[] = [];
  if (source === target) {
    initialPoints = [
      { x: sourceX - 50, y: sourceY - 35 },
      { x: sourceX - 60, y: sourceY - 35 },
      { x: sourceX - 60, y: sourceY - 75 },
      { x: sourceX - 35, y: sourceY - 75 },
      { x: sourceX - 35, y: sourceY - 66 },
    ];
  } else {
    const unitsX: number =
      targetPos === "left" ? -16 : targetPos === "right" ? 16 : 0;

    const unitsY: number =
      targetPos === "top" ? -16 : targetPos === "bottom" ? 16 : 0;

    initialPoints = [
      { x: sourceX, y: sourceY },
      {
        x: (sourceX + targetX) / 2 + unitsX / 2,
        y: (sourceY + targetY) / 2 + unitsY / 2,
      },
      { x: targetX + unitsX, y: targetY + unitsY },
    ];
  }

  const [points, setPoints] = useState(initialPoints);
  const edgePath = useRef("");
  edgePath.current = `M ${points[0].x} ${points[0].y}`;
  points.forEach((point, index) => {
    if (index !== 0) edgePath.current += ` L ${point.x} ${point.y} `;
  });

  const { screenToFlowPosition } = useReactFlow();
  const isMouseDown = useRef(false);
  return (
    <>
      {/* BASE RELATION */}
      <BaseEdge
        {...props}
        id={id}
        path={edgePath.current}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          ...style,
        }}
      />

      {/* RELATION PATH POINTS */}
      {!simulationFlow && selected ? (
        points.map((point, index) => {
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              fill={style?.stroke}
              opacity={"50%"}
              r={5}
              style={{ pointerEvents: "all" }}
              tabIndex={0}
              onDoubleClick={() => {
                setPoints([
                  ...points.slice(0, index + 1),
                  point,
                  ...points.slice(index + 1),
                ]);
              }}
              onMouseDown={() => (isMouseDown.current = true)}
              onMouseUp={() => (isMouseDown.current = false)}
              onMouseLeave={() => (isMouseDown.current = false)}
              onMouseMove={(e) => {
                if (!isMouseDown.current) return;
                e.preventDefault();

                const dragX = e.clientX;
                const dragY = e.clientY;

                const pointsArr = [...points];
                const newPoint = screenToFlowPosition(
                  { x: dragX, y: dragY },
                  { snapToGrid: false }
                );

                const allPointsX =
                  pointsArr.filter((pt) => pt.x === pointsArr[0].x).length ===
                  pointsArr.length;
                const allPointsY =
                  pointsArr.filter((pt) => pt.y === pointsArr[0].y).length ===
                  pointsArr.length;
                if (e.shiftKey) {
                  if (allPointsX) {
                    pointsArr.forEach((pt) => {
                      pt.x = Math.trunc(newPoint.x);
                    });
                  } else if (allPointsY) {
                    pointsArr.forEach((pt) => {
                      pt.y = Math.trunc(newPoint.y);
                    });
                  }
                } else {
                  pointsArr[index] = {
                    x: Math.trunc(newPoint.x),
                    y: Math.trunc(newPoint.y),
                  };
                }
                setPoints(pointsArr);
              }}
            />
          );
        })
      ) : (
        <></>
      )}
    </>
  );
}

BaseRelation.displayName = "BaseRelation";
