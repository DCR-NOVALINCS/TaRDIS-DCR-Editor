import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Node, Position, Edge } from "@xyflow/react";

import dagre from "dagre";

/**
 * Combines multiple class name values into a single string, filtering out falsy values,
 * and merges Tailwind CSS classes intelligently to avoid conflicts.
 *
 * @param inputs - An array of class values (strings, arrays, or objects) to be combined.
 * @returns A single string of merged class names.
 *
 * @remarks
 * This function uses `clsx` to filter and join class names, and `twMerge` to resolve Tailwind CSS class conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates the intersection point on the boundary of the `intersectionNode` where a line from its center
 * towards the center of the `targetNode` would exit. This is typically used for drawing edges between nodes
 * in a diagram, ensuring the edge connects at the border of the node shape.
 *
 * @param intersectionNode - The node whose boundary intersection point is to be calculated. Must contain `measured` (with `width` and `height`)
 * and `internals.positionAbsolute` (with `x` and `y`).
 * @param targetNode - The node towards which the intersection is calculated. Must contain `measured` (with `width` and `height`)
 * and `internals.positionAbsolute` (with `x` and `y`).
 * @returns An object with `x` and `y` properties representing the intersection point on the boundary of `intersectionNode`.
 */
function getNodeIntersection(intersectionNode: any, targetNode: any) {
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured;
  const intersectionNodePosition = {
    x: intersectionNode.internals.positionAbsolute.x,
    y: intersectionNode.internals.positionAbsolute.y,
  };
  const targetPosition = targetNode.internals.positionAbsolute;

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.measured.width / 2;
  const y1 = targetPosition.y + targetNode.measured.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

/**
 * Determines the edge position (Left, Right, Top, or Bottom) of a node
 * relative to a given intersection point.
 *
 * The function compares the intersection point's coordinates to the node's
 * absolute position and dimensions to infer which edge the point is closest to.
 *
 * @param node - The node object, expected to have `internals.positionAbsolute`, `x`, `y`, and `measured.width`/`measured.height` properties.
 * @param intersectionPoint - The point of intersection, with `x` and `y` coordinates.
 * @returns The edge position as a value of the `Position` enum (Left, Right, Top, or Bottom).
 */
function getEdgePosition(node: any, intersectionPoint: any) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.measured.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= n.y + n.measured.height - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

/**
 * Calculates the parameters required to draw an edge between two nodes.
 *
 * Determines the intersection points between the source and target nodes,
 * as well as the positions on the edges of the nodes where the connection should be made.
 *
 * @param source - The source node object.
 * @param target - The target node object.
 * @returns An object containing:
 *   - `sx`: The x-coordinate of the intersection point on the source node.
 *   - `sy`: The y-coordinate of the intersection point on the source node.
 *   - `tx`: The x-coordinate of the intersection point on the target node.
 *   - `ty`: The y-coordinate of the intersection point on the target node.
 *   - `sourcePos`: The edge position on the source node.
 *   - `targetPos`: The edge position on the target node.
 */
export function getEdgeParams(source: any, target: any) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

/**
 * Returns a promise that resolves after a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to delay.
 * @returns A promise that resolves after the specified delay.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width ? node.width : 100,
      height: node.height ? node.height : 100,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.width ? node.width / 2 : 50;
    const height = node.height ? node.height / 2 : 50;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width,
        y: nodeWithPosition.y - height,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
