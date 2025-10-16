import { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
) {
  // Map direction to ELK format
  const elkDirection = direction === "TB" ? "DOWN" : "RIGHT";

  // Build parent-child relationships
  const parentMap = new Map<string, string[]>();
  const nodeParentMap = new Map<string, string>();

  nodes.forEach((node) => {
    const parentId = node.parentId;
    if (parentId) {
      nodeParentMap.set(node.id, parentId);
      if (!parentMap.has(parentId)) parentMap.set(parentId, []);

      parentMap.get(parentId)!.push(node.id);
    }
  });
  console.log("Parent Map:", parentMap);
  console.log("Node Parent Map:", nodeParentMap);

  // Build ELK graph structure
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.edge.routing": "ORTHOGONAL",
      "elk.layered.crossingMinimization.strategy": "LAYER_BY_LAYER",
      "elk.layered.nodePlacement.strategy": "SIMPLE", // Better node placement
      "elk.spacing.edgeNode": "20", // Space between edges and nodes
      "elk.spacing.edgeEdge": "15", // Space between crossing edges
      "elk.layered.spacing.edgeNodeBetweenLayers": "30",
    },
    children: [] as any[],
    edges: [] as any[],
  };
  console.log("Initial ELK Graph:", elkGraph);

  // Add nodes to ELK graph
  nodes.forEach((node) => {
    const width = node.width || 100;
    const height = node.height || 100;
    const parentId = node.parentId;

    const elkNode = {
      id: node.id,
      width,
      height,
      layoutOptions: {},
    };

    // If node has no parent, add to root
    if (!parentId) elkGraph.children.push(elkNode);
  });
  console.log("ELK Graph with Nodes:", elkGraph);

  // Handle compound nodes (parents with children)
  const compoundNodeIds = new Set(parentMap.keys());
  compoundNodeIds.forEach((parentId) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (parentNode) {
      const childIds = parentMap.get(parentId) || [];

      const compoundElkNode = {
        id: parentId,
        layoutOptions: {
          "elk.padding": "[top=100, left=100, bottom=0, right=0]",
          "elk.algorithm": "layered",
          "elk.direction": elkDirection,
          "elk.spacing.nodeNode": "80",
          "elk.layered.spacing.nodeNodeBetweenLayers": "150",
          "elk.edge.routing": "SPLINE",
          "elk.layered.crossingMinimization.strategy": "LAYER_BY_LAYER",
          "elk.layered.nodePlacement.strategy": "SIMPLE", // Better node placement
          "elk.spacing.edgeNode": "20", // Space between edges and nodes
          "elk.spacing.edgeEdge": "15", // Space between crossing edges
          "elk.layered.spacing.edgeNodeBetweenLayers": "30",
        },
        children: [] as any[],
        edges: [] as any[],
      };
      console.log("Processing compound node:", compoundElkNode);

      // Add child nodes to compound node
      childIds.forEach((childId) => {
        const childNode = nodes.find((n) => n.id === childId);
        if (childNode) {
          const childWidth = childNode.width || 100;
          const childHeight = childNode.height || 100;

          compoundElkNode.children.push({
            id: childId,
            width: childWidth,
            height: childHeight,
          });
        }
      });
      console.log("Compound node with children:", compoundElkNode);

      // Add edges within compound node
      edges.forEach((edge) => {
        if (childIds.includes(edge.source) && childIds.includes(edge.target)) {
          compoundElkNode.edges.push({
            id: `${edge.type}-${edge.source}-${edge.target}`,
            sources: [edge.source],
            targets: [edge.target],
          });
        }
      });
      console.log("Compound node with edges:", compoundElkNode);

      // Replace parent node in root children with compound node
      const parentIndex = elkGraph.children.findIndex((n) => n.id === parentId);
      if (parentIndex >= 0) elkGraph.children[parentIndex] = compoundElkNode;
      else elkGraph.children.push(compoundElkNode);

      console.log("Updated ELK Graph with compound node:", elkGraph);
    }
  });
  console.log("Final ELK Graph before layout:", elkGraph);

  // Add root-level edges
  edges.forEach((edge) => {
    const sourceParent = nodeParentMap.get(edge.source);
    const targetParent = nodeParentMap.get(edge.target);

    // Only add to root if not both in same compound
    if (!sourceParent && !targetParent) {
      elkGraph.edges.push({
        id: `${edge.source}-${edge.target}`,
        sources: [edge.source],
        targets: [edge.target],
      });
    }
  });
  console.log("ELK Graph with all edges:", elkGraph);

  // Run ELK layout
  const layoutedGraph = await elk.layout(elkGraph);
  console.log("Layouted ELK Graph:", layoutedGraph);

  // Extract positioned nodes
  const layoutedNodes: Node[] = [];

  const extractNodes = (elkNodes: any[], offsetX = 0, offsetY = 0) => {
    elkNodes.forEach((elkNode) => {
      const originalNode = nodes.find((n) => n.id === elkNode.id);
      if (originalNode) {
        layoutedNodes.push({
          ...originalNode,
          position: {
            x:
              offsetX > 0 && compoundNodeIds.has(elkNode.id)
                ? 0
                : elkNode.x || 0,
            y:
              offsetY > 0 && compoundNodeIds.has(elkNode.id)
                ? 0
                : elkNode.y || 0,
          },
          width: elkNode.width,
          height: elkNode.height,
        });
      }

      // Process children of compound nodes
      if (elkNode.children) {
        const nodeX = elkNode.x || 0;
        const nodeY = elkNode.y || 0;
        extractNodes(elkNode.children, offsetX + nodeX, offsetY + nodeY);
      }
    });
  };
  console.log("Extracting nodes from layouted graph...");

  extractNodes(layoutedGraph.children || []);
  console.log("Extracted layouted nodes:", layoutedNodes);

  layoutedNodes.forEach((node) => {
    const isCompound = compoundNodeIds.has(node.id);

    if (!isCompound) {
      layoutedNodes.forEach((other) => {
        if (
          compoundNodeIds.has(other.id) &&
          edges.some(
            (e) =>
              (e.source === node.id && e.target === other.id) ||
              (e.source === other.id && e.target === node.id)
          )
        ) {
          const dx = node.position!.x - other.position!.x;
          const dy = node.position!.y - other.position!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Use actual compound node dimensions
          const compoundRadius =
            Math.max(other.width || 300, other.height || 300) / 2;
          const minDist = compoundRadius + 150; // Extra margin beyond compound edge

          if (dist < minDist && dist > 0) {
            const angle = Math.atan2(dy, dx);
            node.position!.x = other.position!.x + Math.cos(angle) * minDist;
            node.position!.y = other.position!.y + Math.sin(angle) * minDist;
          }
        }
      });
    }
  });

  return { nodes: layoutedNodes, edges };
}
