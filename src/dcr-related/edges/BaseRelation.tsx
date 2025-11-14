import {
  BaseEdge,
  EdgeProps,
  useInternalNode,
  useReactFlow,
} from "@xyflow/react";
import { useRef, useState } from "react";
import { getEdgeParams } from "@/lib/utils";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
  edgesTypes: state.edgesTypes,
});

/**
 * `RelationProperties` type that extends `EdgeProps` with an optional `relationPath` property.
 */
export interface RelationProperties extends EdgeProps {
  relationPath?: string;
}

/**
 * Renders a customizable relation (edge) between two nodes using the {@link BaseEdge `BaseEdge`} component
 * from ReactFlow. The component supports both a fully custom SVG path (via the
 * `relationPath` prop) and a computed polyline path that can be interactively edited
 * when the edge is selected and the editor is not in simulation mode.
 *
 * @param relationPath - optional explicit SVG path to use for the edge. When provided, the computed path
 * logic and path control points are skipped.
 * @param ...props - all the other props from {@link EdgeProps `EdgeProps`} (id, source, target, markerStart, markerEnd, selected, style, ...)
 * are forwarded to the underlying {@link BaseEdge `BaseEdge`}.
 *
 * Behavior summary:
 * - If `relationPath` is provided, it is used directly as the edge path and the edge
 *   is rendered with a stroke width of 2 (merged with any provided `style`).
 * - Otherwise, source and target nodes are resolved through {@link useInternalNode `useInternalNode`}, and
 *   {@link getEdgeParams `getEdgeParams`} is used to compute anchor points and {@link targetPos `targetPos`}.
 *   - For self-referential edges (`source === target`), a predefined loop path composed
 *     of several control points is created; the exact initial points depend on the
 *     {@link edgesTypes `edgesTypes`} value from the global store.
 *   - For normal edges, an initial three-point polyline is created: [source, mid, target],
 *     where the mid point is offset according to the target position (left/right/top/bottom)
 *     to provide a nicer curvature/handle placement.
 *
 * Interactive editing:
 * - The computed points are stored in component state and converted into an SVG path
 *   string (`M x y L x y ...`).
 * - When `selected` is true and {@link simulationFlow `simulationFlow`} from the store is false, the component
 *   renders draggable control points (SVG circles) for manipulating the path.
 *   - Double-clicking a control point inserts a duplicate point after it (useful for
 *     creating a new bend).
 *   - Dragging a control point updates the corresponding point in flow coordinates via
 *     {@link screenToFlowPosition `screenToFlowPosition`} from {@link useReactFlow `useReactFlow`}.
 *   - If the Shift key is held while dragging and all points share the same X or Y,
 *     the drag will snap all points to the dragged coordinate along that axis (constraining
 *     movement to a single axis).
 *   - For edges with only a single control point, dragging replaces the single point
 *     with a duplicated point at the drag location (creating a two-point segment).
 * - Pointer event handling (mouse down/up/leave/move) is used to implement the drag
 *   interactions; `pointerEvents: "all"` is set on the circles and `tabIndex` is provided
 *   for keyboard focusability.
 *
 * Side effects / hooks used:
 * - {@link useInternalNode `useInternalNode(source/target)`} to resolve node positions/anchors.
 * - {@link screenToFlowPosition `screenToFlowPosition`} to convert screen coordinates to flow coordinates.
 * - {@link useStore `useStore(selector)`} to read {@link simulationFlow `simulationFlow`} and {@link edgesTypes `edgesTypes`} from the global store.
 *
 * Notes:
 * - The component always enforces a stroke width of 2 by default; caller `style` is merged.
 * - The live edge path is stored in a ref and recomputed on each render from the `points`
 *   state to minimize unnecessary re-renders of the path string.
 *
 * @component
 * @returns a JSX fragment containing:
 * - The primary {@link BaseEdge `BaseEdge`} rendering the relation path.
 * - Optional SVG circle handles for interactive editing when applicable.
 */
export default function BaseRelation(relationProps: RelationProperties) {
  const { simulationFlow, edgesTypes } = useStore(selector, shallow);
  const { id, source, target, markerStart, markerEnd, selected, style } =
    relationProps;

  if (relationProps.relationPath) {
    return (
      <BaseEdge
        {...relationProps}
        id={id}
        path={relationProps.relationPath}
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
    if (edgesTypes === "old") {
      initialPoints = [
        { x: sourceX - 50, y: sourceY - 35 },
        { x: sourceX - 60, y: sourceY - 35 },
        { x: sourceX - 60, y: sourceY - 75 },
        { x: sourceX - 35, y: sourceY - 75 },
        { x: sourceX - 35, y: sourceY - 66 },
      ];
    } else {
      initialPoints = [
        { x: sourceX - 45, y: sourceY - 55 },
        { x: sourceX - 50, y: sourceY - 55 },
      ];
    }
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
        {...relationProps}
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
        points.length > 2 ? (
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
          <circle
            key={points[0].x}
            cx={points[0].x}
            cy={points[0].y}
            fill={style?.stroke}
            opacity={"50%"}
            r={5}
            style={{ pointerEvents: "all" }}
            tabIndex={0}
            onMouseDown={() => (isMouseDown.current = true)}
            onMouseUp={() => (isMouseDown.current = false)}
            onMouseLeave={() => (isMouseDown.current = false)}
            onMouseMove={(e) => {
              if (!isMouseDown.current) return;
              e.preventDefault();

              const dragX = e.clientX;
              const dragY = e.clientY;

              const newPoint = screenToFlowPosition(
                { x: dragX, y: dragY },
                { snapToGrid: false }
              );

              const pointToAdd = {
                x: Math.trunc(newPoint.x),
                y: Math.trunc(newPoint.y),
              };
              setPoints([pointToAdd, pointToAdd]);
            }}
          />
        )
      ) : null}
    </>
  );
}
