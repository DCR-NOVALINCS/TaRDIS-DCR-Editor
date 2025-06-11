import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Node, Position } from "@xyflow/react";

/**
 * Utility function to merge class names using clsx and tailwind-merge.
 * @param inputs - Class names to be merged.
 * @returns Merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the intersection point of two nodes.
 * @param intersectionNode - The node that is being intersected.
 * @param targetNode - The node that is being intersected with.
 * @returns The intersection point of the two nodes.
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
 * Returns the edge position of a node based on the intersection point.
 * @param node - The node for which the edge position is being calculated.
 * @param intersectionPoint  - The intersection point of the node and the target node.
 * @returns The edge position of the node.
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
 * Returns the edge parameters for a connection line between two nodes.
 * @param source - The source node.
 * @param target - The target node.
 * @returns An object containing the edge parameters.
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
 * Returns the relative position of a node with respect to another node.
 * @param source - The source node.
 * @param target - The target node.
 * @returns The relative position of the source node with respect to the target node.
 */
export function getNodeRelativePosition(source: Node, target: Node) {
  const { x: sx, y: sy } = source.position;
  const { x: tx, y: ty } = target.position;

  if (sy + 100 < ty) return Position.Top;
  else if (ty + 100 < sy) return Position.Bottom;
  else if (sx + 100 < tx) return Position.Left;
  else return Position.Right;
}

export function calcSubgraphArgs(
  children: { x: number; y: number; width: number; height: number }[]
) {
  let maxX = -1000000,
    maxY = -1000000;
  let minX = 1000000,
    minY = 1000000;
  let maxWidth = -1000000,
    maxHeight = -1000000;

  children.forEach((child) => {
    if (child.x > maxX) maxX = child.x;
    if (child.x < minX) minX = child.x;
    if (child.y > maxY) maxY = child.y;
    if (child.y < minY) minY = child.y;
    if (child.width > maxWidth) maxWidth = child.width;
    if (child.height > maxHeight) maxHeight = child.height;
  });

  const x = Math.trunc(minX + (maxX - minX) / 2);
  const y = Math.trunc(minY + (maxY - minY) / 2);
  const width = Math.trunc(maxX - minX + maxWidth + 50);
  const height = Math.trunc(maxY - minY + maxHeight + 150);

  return {
    x,
    y,
    width,
    height,
  };
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitArray(array: string[], regex: string): string[][] {
  let stringStringArr: string[][] = [];
  let stringArr: string[] = [];
  array.forEach((str) => {
    if (str === regex) {
      stringStringArr.push(stringArr);
      stringArr = [];
    } else stringArr.push(str);
  });

  if (stringArr.length > 0) stringStringArr.push(stringArr);

  return stringStringArr;
}
