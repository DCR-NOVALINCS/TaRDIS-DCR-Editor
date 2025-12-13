import { Node, Edge } from "@xyflow/react";
import {
  Event,
  Nest,
  Subprocess,
  Process,
  ProcessNode,
  relationsMap,
  Relation,
  Role,
  RelationCreationParams,
} from "./data-types/codegen-types";

/**
 * Extracts a mapping of process identifiers to `Process` objects from a set of graph nodes and edges.
 *
 * This function is a high-level coordinator that:
 * 1. Categorizes the provided nodes into events, nests and subprocesses via `categorizeNodes`.
 * 2. Processes the provided edges to determine relations between categorized nodes via `processEdges`.
 * 3. Builds a hierarchical process representation from the categorized nodes and computed relations via `buildProcessHierarchy`.
 *
 * @param nodes - Array of {@link Node `Node`} objects representing the elements of the graph to analyze (events, nests, subprocesses, etc.).
 * @param edges - Array of {@link Edge `Edge`} objects representing relationships or connections between nodes in the graph.
 *
 * @returns A Map whose keys are process identifiers (string) and whose values are the corresponding `Process` objects representing
 *          the assembled process hierarchy.
 *
 * @remarks
 * - The function delegates the heavy lifting to helper utilities: `categorizeNodes`, `processEdges` and `buildProcessHierarchy`.
 * - Any validation or transformation of individual node/edge shapes is expected to be handled by those helper functions.
 * - Errors thrown by the helper functions will propagate to the caller.
 *
 * @see {@link Process `Process`}
 * @see {@link categorizeNodes `categorizeNodes`}
 * @see {@link processEdges `processEdges`}
 * @see {@link buildProcessHierarchy `buildProcessHierarchy`}
 */
function extractData(nodes: Node[], edges: Edge[]): Map<string, Process> {
  const { events, nests, subprocesses } = categorizeNodes(nodes);
  const relations = processEdges(edges, events, nests, subprocesses);

  return buildProcessHierarchy(events, nests, subprocesses, relations);
}

/**
 * Categorizes an array of Node objects into three typed collections.
 *
 * Iterates the provided nodes and produces:
 * - `events`: all nodes where `node.type === "event"`, mapped with `createEventFromNode`
 * - `nests`: all nodes where `node.type === "nest"`, mapped with `createNestFromNode`
 * - `subprocesses`: all nodes where `node.type === "subprocess"`, mapped with `createSubprocessFromNode`
 *
 * The input array is not mutated and the relative order of nodes in each resulting
 * array matches their order in the input. Nodes with types other than the three
 * listed above are ignored.
 *
 * @param nodes - Array of `Node` objects to categorize.
 *
 * @returns An object containing:
 *  - `events`: {@link Event `Event[]`} — mapped event nodes
 *  - `nests`: {@link Nest `Nest[]`} — mapped nest nodes
 *  - `subprocesses`: {@link Subprocess `Subprocess[]`} — mapped subprocess nodes
 *
 * @remarks
 * This function delegates conversion to `createEventFromNode`, `createNestFromNode`
 * and `createSubprocessFromNode`. Any errors thrown by those helpers will propagate
 * to the caller.
 *
 * @see {@link Node `Node`}
 * @see {@link createEventFromNode `createEventFromNode`}
 * @see {@link createNestFromNode `createNestFromNode`}
 * @see {@link createSubprocessFromNode `createSubprocessFromNode`}
 */
function categorizeNodes(nodes: Node[]): {
  events: Event[];
  nests: Nest[];
  subprocesses: Subprocess[];
} {
  const events: Event[] = nodes
    .filter((n) => n.type === "event")
    .map((n) => createEventFromNode(n));

  const nests: Nest[] = nodes
    .filter((n) => n.type === "nest")
    .map((n) => createNestFromNode(n));

  const subprocesses: Subprocess[] = nodes
    .filter((n) => n.type === "subprocess")
    .map((n) => createSubprocessFromNode(n));

  return { events, nests, subprocesses };
}

/**
 * Create an `Event` object from a generic node-like object.
 *
 * The `data` payload is asserted to `Event` and the following fields are
 * picked and propagated into the returned object: `label`, `name`, `security`,
 * `initiators`, `marking`, `input`, `expression`, and `receivers`.
 *
 * Conditional inclusion:
 * - `input` is included only if truthy.
 * - `expression` is included only if truthy.
 * - `receivers` is included only if `receivers?.length` is truthy (so an empty
 *   array will not be emitted).
 *
 * The `parent` field of the returned `Event` is set to `node.parentId` if
 * present and truthy, otherwise it defaults to the string `"global"`.
 *
 * @param node - Source node object containing event data of type {@link Node `Node`}.
 *
 * @returns A new `Event` object constructed from the node
 *
 * @see {@link Event `Event`}
 */
function createEventFromNode(node: Node): Event {
  const { id, data, parentId } = node;

  const {
    label,
    name,
    security,
    input,
    expression,
    initiators,
    receivers,
    marking,
  } = data as unknown as Event;

  return {
    id,
    label,
    name,
    security,
    initiators,
    marking,
    parent: parentId || "global",
    ...(input && { input }),
    ...(expression && { expression }),
    ...(receivers?.length && { receivers }),
  };
}

/**
 * Create a `Nest` object from a diagram node.
 *
 * Extracts the expected `Nest` fields from the node's data and returns a
 * normalized `Nest` with an explicit parent reference. The function assumes
 * the incoming node has the shape:
 * { id: string, data: { label?: string, marking?: string, nestType?: string }, parentId?: string }
 *
 * @param node - Source node object containing nest data of type {@link Node `Node`}.
 *
 * @returns A new `Nest` object constructed from the node.
 *
 * @see {@link Nest `Nest`}
 *
 */
function createNestFromNode(node: Node): Nest {
  const { id, data, parentId } = node as {
    id: string;
    data: Record<string, unknown>;
    parentId: string;
  };

  const { label, marking, nestType } = data as unknown as Nest;

  return {
    id,
    label,
    marking,
    nestType,
    parent: parentId || "global",
  };
}

/**
 * Creates a `Subprocess` object from a diagram node.
 *
 * Extracts the expected `Subprocess` fields from the node's data and returns a
 * normalized `Subprocess` with an explicit parent reference. The function assumes
 * the incoming node has the shape:
 * { id: string, data: { label?: string, marking?: string }, parentId?: string }
 *
 * @param node - Source node object containing subprocess data of type {@link Node `Node`}.
 *
 * @returns A new `Subprocess` object constructed from the node.
 *
 * @see {@link Subprocess `Subprocess`}
 */
function createSubprocessFromNode(node: Node): Subprocess {
  const { id, data, parentId } = node as {
    id: string;
    data: Record<string, unknown>;
    parentId: string;
  };

  const { label, marking } = data as unknown as Subprocess;

  return {
    id,
    label,
    marking,
    parent: parentId || "global",
  };
}

/**
 * Recursively collects events belonging to a node and all of its descendant nests/subprocesses.
 *
 * Traverses the hierarchy starting from `node`, finds events whose `parent` equals the current node's `id`,
 * and returns a flat array of groups where each group contains the events for a specific parent id.
 * The first group in the returned array corresponds to the provided `node` (its direct child events);
 * subsequent groups correspond to descendant nests and subprocesses discovered during recursion.
 *
 * @param node - The starting nest or subprocess node whose events and descendants' events are to be collected.
 * @param events - All event nodes to consider for collection. Each `EventType` is expected to have a `parent` property referencing its parent node id.
 * @param nests - All nest nodes. Each `NestType` is expected to have a `parent` property referencing its parent node id.
 * @param subprocesses - All subprocess nodes. Each `SubprocessType` is expected to have a `parent` property referencing its parent node id.
 * @returns An array of objects of shape `{ events: EventType[]; parent: string }[]`, where:
 *  - `events` is the list of `EventType` entries whose `parent` equals the corresponding `parent` id,
 *  - `parent` is the id of the node that owns those events.
 *
 * @remarks
 * - The function performs a depth-first traversal of the hierarchy.
 * - The returned array includes the direct child events of the provided `node` as the first element.
 * - Subsequent elements correspond to events found in descendant nests and subprocesses.
 *
 * @see {@link EventType `EventType`}
 * @see {@link NestType `NestType`}
 * @see {@link SubprocessType `SubprocessType`}
 */
function getChildrenEvents(
  node: Nest | Subprocess,
  events: Event[],
  nests: Nest[],
  subprocesses: Subprocess[]
): { events: Event[]; parent: string }[] {
  const directChildEvents = events.filter((e) => e.parent === node.id);
  const childNests = nests.filter((n) => n.parent === node.id);
  const childSubprocesses = subprocesses.filter((s) => s.parent === node.id);

  let allChildren = [{ events: directChildEvents, parent: node.id }];

  [...childNests, ...childSubprocesses].forEach((child) => {
    allChildren.push(...getChildrenEvents(child, events, nests, subprocesses));
  });

  return allChildren;
}

/**
 * Processes a list of graph edges and produces a flattened array of relation objects.
 *
 * For each edge in `edges` this function:
 * - extracts edge properties (`id`, `source`, `target`, `type`, `data.guard`),
 * - resolves the corresponding source and target nodes using `findNode` (searching through the provided
 *   `events`, `nests`, and `subprocesses` collections),
 * - skips the edge if either the source or target node cannot be found,
 * - invokes `createRelationsForEdge` with the resolved nodes and contextual collections to obtain one or more
 *   `Relation` objects, and
 * - appends the produced relations to the accumulated result preserving edge order.
 *
 * After processing all edges, any relation whose `id` equals the sentinel string `"toDelete"` is removed from
 * the result before it is returned.
 *
 * @param edges - Array of edges to process. Each edge is expected to include at least `id`, `source`, and `target`.
 * @param events - Collection of event nodes used by `findNode`.
 * @param nests - Collection of nest nodes used by `findNode`.
 * @param subprocesses - Collection of subprocess nodes used by `findNode`.
 *
 * @returns An array of `Relation` objects produced from all processed edges, excluding any relation with id `"toDelete"`.
 *
 * @see {@link Relation `Relation`}
 * @see {@link findNode `findNode`}
 * @see {@link createRelationsForEdge `createRelationsForEdge`}
 */
function processEdges(
  edges: Edge[],
  events: Event[],
  nests: Nest[],
  subprocesses: Subprocess[]
): Relation[] {
  const relations: Relation[] = [];
  edges.forEach((edge) => {
    const { id, source, target, type, data } = edge;
    const guard = (data as { guard?: string })?.guard;

    const sourceNode = findNode(source, events, nests, subprocesses);
    const targetNode = findNode(target, events, nests, subprocesses);

    if (!sourceNode || !targetNode || !type) return;

    const edgeRelations = createRelationsForEdge({
      id,
      source,
      target,
      type,
      guard,
      sourceNode,
      targetNode,
      events,
      nests,
      subprocesses,
    });

    relations.push(...edgeRelations);
  });

  return relations.filter((r) => r.id !== "toDelete");
}

/**
 * Finds a process node with the given id by searching the provided collections.
 *
 * The search is performed in order: events, then nests, then subprocesses.
 * Each collection is scanned for an element whose `id` property strictly equals (`===`) the supplied id.
 *
 * @param id - The identifier of the node to find.
 * @param events - Array of {@link Event `Event`} nodes to search first.
 * @param nests - Array of {@link Nest `Nest`} nodes to search second.
 * @param subprocesses - Array of {@link Subprocess `Subprocess`} nodes to search last.
 *
 * @returns The first matching {@link ProcessNode `ProcessNode`} found in the provided arrays, or `undefined` if no match exists.
 *
 * @remarks
 * This function does not modify the input arrays and returns as soon as a match is found.
 */
function findNode(
  id: string,
  events: Event[],
  nests: Nest[],
  subprocesses: Subprocess[]
): ProcessNode | undefined {
  return (
    events.find((n) => n.id === id) ||
    nests.find((n) => n.id === id) ||
    subprocesses.find((n) => n.id === id)
  );
}

/**
 * Determines whether a node (a nest or a subprocess) is a descendant of a given ancestor.
 *
 * The function walks up the parent chain starting from `nodeId`. At each step it looks up the
 * current id in `nests` and `subprocesses` to obtain its `parent` and compares that parent to
 * `ancestorId`. The walk continues until the chain reaches the sentinel id `"global"` or no
 * parent is found.
 *
 * Notes:
 * - Returns true if `ancestorId` appears anywhere in the parent chain of `nodeId`.
 * - If `nodeId === ancestorId` the function returns false (only parent relationships are considered).
 * - Assumes ids are unique across `nests` and `subprocesses`.
 *
 * @param nodeId - The id of the starting node (nest or subprocess).
 * @param ancestorId - The id to check as an ancestor.
 * @param nests - Array of nest entries (objects with at least `id` and `parent` properties).
 * @param subprocesses - Array of subprocess entries (objects with at least `id` and `parent` properties).
 *
 * @returns True if `ancestorId` is found in the parent chain of `nodeId`; otherwise false.
 */
function isDescendantOf(
  nodeId: string,
  ancestorId: string,
  nests: Nest[],
  subprocesses: Subprocess[]
): boolean {
  let currentId = nodeId;

  while (currentId && currentId !== "global") {
    const nest = nests.find((n) => n.id === currentId);
    const subprocess = subprocesses.find((s) => s.id === currentId);

    const parent = nest?.parent || subprocess?.parent;

    if (parent === ancestorId) return true;

    currentId = parent || "";
  }

  return false;
}

/**
 * Creates one or more `Relation` entries that correspond to a single edge in
 * the editor graph. The function expands edges that reference container nodes
 * (nests or subprocesses) into concrete event-to-event relations by resolving
 * the children events of those containers. It also handles "spawn" edges as a
 * special-case single relation.
 *
 * Behavior summary:
 * - If `type === "spawn"`, returns exactly one relation between the given
 *   source and target node labels and resolves the relation's parent using the
 *   internal parent-resolution logic.
 * - If both `source` and `target` refer to events, returns a single relation
 *   between the corresponding event nodes.
 * - If either endpoint refers to a container (nest or subprocess), expands that
 *   endpoint into its contained events (via {@link getChildrenEvents `getChildrenEvents`}) and produces all
 *   pairwise relations between the resolved events.
 * - If no relations can be produced (unexpected), returns a sentinel
 *   placeholder relation with id `"toDelete"`.
 *
 * Parent resolution ({@link getEdgeParent `getEdgeParent`} logic):
 * - If either parent is undefined the parent is considered `"global"`.
 * - If one parent is `"global"`, the other parent is used.
 * - If parents are identical, that parent is returned.
 * - Otherwise, the function uses {@link isDescendantOf `isDescendantOf`} to determine which parent is
 *   deeper in the hierarchy and returns the descendant; if neither is a
 *   descendant of the other, the source parent is used as a default.
 *
 * Guard handling:
 * - If a guard string is provided, it is copied into each produced relation via
 *   an optional `guard` field.
 *
 * @param params - An object of type {@link RelationCreationParams `RelationCreationParams`} containing:
 *  - `id`: The identifier for the edge/relation.
 * - `source`: The source node id of the edge.
 * - `target`: The target node id of the edge.
 * - `type`: The type of the edge (e.g., "condition", "response", "spawn", etc.).
 * - `guard`: Optional guard expression associated with the edge.
 * - `sourceNode`: The resolved source `ProcessNode` corresponding to the edge's source id.
 * - `targetNode`: The resolved target `ProcessNode` corresponding to the edge's target id.
 * - `events`: Collection of all event nodes.
 * - `nests`: Collection of all nest nodes.
 * - `subprocesses`: Collection of all subprocess nodes.
 *
 * @returns An array of `Relation` objects expanded from the given edge. For
 *          spawn or event-to-event edges this will typically be a single
 *          relation; for container endpoints it may contain multiple relations.
 *          If no relations can be produced, returns a single placeholder
 *          relation with id `"toDelete"`.
 *
 * @see {@link Relation `Relation`}
 * @see {@link ProcessNode `ProcessNode`}
 */
function createRelationsForEdge(params: RelationCreationParams): Relation[] {
  const {
    id,
    source,
    target,
    type,
    guard,
    sourceNode,
    targetNode,
    events,
    nests,
    subprocesses,
  } = params;
  const relations: Relation[] = [];

  /**
   * Determines the appropriate parent for an edge based on the parents of its source and target nodes.
   *
   * The function follows these rules:
   * - If either parent is undefined, the parent is considered "global".
   * - If one parent is "global", the other parent is used.
   * - If both parents are identical, that parent is returned.
   * - If the parents differ, the function checks if one is a descendant of the other
   *  using `isDescendantOf` and returns the deeper (descendant) parent. If neither is a descendant of the other,
   * the source parent is returned by default.
   *
   * @param sourceParent - The parent ID of the source node.
   * @param targetParent - The parent ID of the target node.
   * @returns The determined parent ID for the edge.
   */
  function getEdgeParent(
    sourceParent: string | undefined,
    targetParent: string | undefined
  ): string {
    if (!sourceParent || !targetParent) return "global";

    if (sourceParent === "global") return targetParent;
    if (targetParent === "global") return sourceParent;
    if (sourceParent === targetParent) return sourceParent;

    const isSourceDescendantOfTarget = isDescendantOf(
      sourceParent,
      targetParent,
      nests,
      subprocesses
    );

    const isTargetDescendantOfSource = isDescendantOf(
      targetParent,
      sourceParent,
      nests,
      subprocesses
    );

    if (isSourceDescendantOfTarget) return sourceParent;
    if (isTargetDescendantOfSource) return targetParent;

    return sourceParent;
  }

  if (type === "spawn")
    return [
      {
        id,
        source: sourceNode.label,
        target: targetNode.label,
        type,
        parent: getEdgeParent(sourceNode.parent, targetNode.parent),
        ...(guard && { guard }),
      },
    ];

  const isSourceEvent = events.some((e) => e.id === source);
  const isTargetEvent = events.some((e) => e.id === target);

  if (isSourceEvent && isTargetEvent)
    relations.push({
      id,
      source: sourceNode.label,
      target: targetNode.label,
      type,
      parent: getEdgeParent(sourceNode.parent, targetNode.parent),
      ...(guard && { guard }),
    });
  else if (isSourceEvent && !isTargetEvent) {
    const targetChildren = getChildrenEvents(
      targetNode as Nest | Subprocess,
      events,
      nests,
      subprocesses
    );

    targetChildren.forEach((child) => {
      child.events.forEach((event) => {
        relations.push({
          id,
          source: sourceNode.label,
          target: event.label,
          type,
          parent: getEdgeParent(sourceNode.parent, child.parent),
          ...(guard && { guard }),
        });
      });
    });
  } else if (!isSourceEvent && isTargetEvent) {
    const sourceChildren = getChildrenEvents(
      sourceNode as Nest | Subprocess,
      events,
      nests,
      subprocesses
    );

    sourceChildren.forEach((child) => {
      child.events.forEach((event) => {
        relations.push({
          id,
          source: event.label,
          target: targetNode.label,
          type,
          parent: getEdgeParent(child.parent, targetNode.parent),
          ...(guard && { guard }),
        });
      });
    });
  } else {
    // Container to Container
    const sourceChildren = getChildrenEvents(
      sourceNode as Nest | Subprocess,
      events,
      nests,
      subprocesses
    );
    const targetChildren = getChildrenEvents(
      targetNode as Nest | Subprocess,
      events,
      nests,
      subprocesses
    );

    sourceChildren.forEach((sourceChild) => {
      sourceChild.events.forEach((sourceEvent) => {
        targetChildren.forEach((targetChild) => {
          targetChild.events.forEach((targetEvent) => {
            relations.push({
              id,
              source: sourceEvent.label,
              target: targetEvent.label,
              type,
              parent: getEdgeParent(sourceChild.parent, targetChild.parent),
              ...(guard && { guard }),
            });
          });
        });
      });
    });
  }

  return relations.length > 0
    ? relations
    : [
        {
          id: "toDelete",
          source: "",
          target: "",
          type: "",
        },
      ];
}

/**
 * Determine the ultimate parent identifier for a process item or relation.
 *
 * The function walks parent links to resolve the highest-level parent for the
 * provided item according to the following rules:
 * - If the item's parent is falsy or the string "global", the function returns "global".
 * - If the item's parent matches a `Nest` id, the function recurses into that `Nest`
 *   to continue resolving its parent (nests form a hierarchical chain).
 * - If the item's parent does not match a `Nest` but matches a `Subprocess` id,
 *   the `Subprocess` id is considered a terminal parent and is returned.
 * - If no matching `Nest` or `Subprocess` is found, the function falls back to "global".
 *
 * The function is pure and has no side effects.
 *
 * @param item - The {@link ProcessNode `ProcessNode`} or {@link Relation `Relation`} whose ultimate parent should be resolved.
 *               It is expected to have a `parent` property containing the id of its parent
 *               (or a falsy value when no parent is set).
 * @param nests - Array of `Nest` objects; each Nest is expected to have an `id` and may itself
 *                reference a parent, enabling recursive resolution.
 * @param subprocesses - Array of `Subprocess` objects; each `Subprocess` is expected to have an `id`.
 *                       Subprocesses are treated as terminal parents (no further recursion).
 *
 * @returns The id string of the ultimate parent: either "global" or the id of a `Nest`/`Subprocess`
 *          that constitutes the highest-level parent for the provided item.
 *
 * @remarks
 * - Recursion only follows `Nest` parents; encountering a `Subprocess` parent stops recursion
 *   and returns that `Subprocess` id directly.
 * - The function normalizes missing or unresolvable parents to the literal "global".
 *
 * @see {@link Nest `Nest`}
 * @see {@link Subprocess `Subprocess`}
 */
function findUltimateParent(
  item: ProcessNode | Relation,
  nests: Nest[],
  subprocesses: Subprocess[]
): string {
  if (!item.parent || item.parent === "global") return "global";

  const nestParent = nests.find((n) => n.id === item.parent);
  if (nestParent) return findUltimateParent(nestParent, nests, subprocesses);

  const subprocessParent = subprocesses.find((s) => s.id === item.parent);
  return subprocessParent ? item.parent : "global";
}

/**
 * Build a mapping of parent process IDs to their contained process elements.
 *
 * This function:
 * - Computes the ultimate parent for every event, nest, subprocess and relation using
 *   {@link findUltimateParent `findUltimateParent`}, producing shallow-cloned arrays with updated `parent` fields.
 * - Constructs a `Map` whose keys are the top-level parent identifiers to consider:
 *   the literal "global" plus every subprocess id.
 * - For each parent id, collects the items whose updated `parent` equals that id into a
 *   `Process` object and stores it under that key.
 *
 * Important details:
 * - Original input arrays are not mutated; cloned items are created via object spread
 *   with an updated `parent` property.
 * - The returned Map includes an entry for "global" (top-level) and one entry per
 *   subprocess id.
 * - The `Process.parentProcess` property is the parent id of that parent process (derived
 *   from the corresponding subprocess' updated parent) or an empty string when none
 *   exists (e.g., for "global" or top-level subprocesses).
 * - Only direct children (items whose updated `parent` strictly equals the parent id)
 *   are placed in each `Process`; nested containment is represented via the parent ids.
 *
 * @param events - Array of {@link Event `Event`} objects to include and assign to parent processes.
 * @param nests - Array of {@link Nest `Nest`} objects to include and assign to parent processes.
 * @param subprocesses - Array of {@link Subprocess `Subprocess`} objects; their ids determine additional
 *   parent keys in the result and their updated parent establishes parentProcess links.
 * @param relations - Array of {@link Relation `Relation`} objects to include and assign to parent processes.
 * @returns A `Map` whose keys are parent ids ("global" and each subprocess id) and whose
 *   values are `Process` objects.
 *
 * @see {@link Process `Process`}
 */
function buildProcessHierarchy(
  events: Event[],
  nests: Nest[],
  subprocesses: Subprocess[],
  relations: Relation[]
): Map<string, Process> {
  // Update all items to have their ultimate parent
  const updatedEvents = events.map((e) => ({
    ...e,
    parent: findUltimateParent(e, nests, subprocesses),
  }));

  const updatedNests = nests.map((n) => ({
    ...n,
    parent: findUltimateParent(n, nests, subprocesses),
  }));

  const updatedSubprocesses = subprocesses.map((s) => ({
    ...s,
    parent: findUltimateParent(s, nests, subprocesses),
  }));

  const updatedRelations = relations.map((r) => ({
    ...r,
    parent: findUltimateParent(r, nests, subprocesses),
  }));

  // Create parent process map
  const parentProcesses = new Map<string, Process>();
  const allParentIds = ["global", ...updatedSubprocesses.map((s) => s.id)];

  allParentIds.forEach((parentId) => {
    const parentProcess = updatedSubprocesses.find((s) => s.id === parentId);
    const upParent = parentProcess?.parent || "";

    parentProcesses.set(parentId, {
      events: updatedEvents.filter((e) => e.parent === parentId),
      relations: updatedRelations.filter((r) => r.parent === parentId),
      nests: updatedNests.filter((n) => n.parent === parentId),
      subprocesses: updatedSubprocesses.filter((s) => s.parent === parentId),
      parentProcess: upParent,
    });
  });

  return parentProcesses;
}

/**
 * Generate a textual representation of the system code from graph-like inputs.
 *
 * The function extracts process information from the provided node/edge graph,
 * serialises role declarations (including their type parameters), inserts the
 * lattice marker, and appends the global process body when present.
 *
 * Behaviour details:
 * - Calls {@link extractData `extractData(nodes, edges)`} to obtain a mapping of named processes.
 * - Emits each role's label. If a role has type parameters, they are emitted
 *   as `(var:type; var2:type2)` with parameters separated by `"; "`.
 * - Inserts a line containing `";"`, followed by the provided `lattice`, and
 *   another `";"`.
 * - If a `"global"` process exists in the extracted process map, it is
 *   rendered by calling {@link writeProcess `writeProcess(globalProcess, parentProcess, 1)`} and
 *   appended to the output. The lines returned by the function are joined with
 *   newline characters before appending.
 * - The final output is the concatenation of all emitted parts joined with
 *   newline characters.
 *
 * @param nodes - Array of {@link Node `Node`} objects representing process nodes in the graph.
 * @param edges - Array of {@link Edge `Edge`} objects representing connections between nodes.
 * @param roles - Array of {@link Role `Role`} objects to be declared at the top of the output.
 *                Each role contain a `label` and a `fields` array of type {@link Field `Field`}.
 * @param lattice - A string to be inserted between semicolon markers in the output.
 *
 * @returns The ReGraDa representation of the code - a string containing the generated code text composed of role
 *          declarations, the security lattice section, and the optional global
 *          process body
 */
export function writeCode(
  nodes: Node[],
  edges: Edge[],
  roles: Role[],
  lattice: string
): string {
  const parentProcess = extractData(nodes, edges);
  const content: string[] = [];

  console.log("Writing roles: ", roles);
  roles.forEach((role) => {
    console.log("Writing role: ", role);
    let roleContent = role.label;
    if ("fields" in role && role.fields.length > 0) {
      const typeParams = role.fields
        .map((field) => `${field.var}:${field.type}`)
        .join("; ");
      roleContent += `(${typeParams})`;
    }
    content.push(roleContent);
  });

  content.push(";", lattice, ";");

  const globalProcess = parentProcess.get("global");
  if (globalProcess)
    content.push(writeProcess(globalProcess, parentProcess, 1).join("\n"));

  return content.join("\n");
}

/**
 * Generates the textual representation of a `Process` as an array of lines.
 *
 * The function walks the given `process` and produces a sequence of strings
 * representing events and relations. Events are converted with the external
 * helper `formatEvent` and appended first. If the process has any relations,
 * a semicolon (";") is inserted between the event list and the relation list.
 *
 * Relations are rendered one-per-line except for "spawn" relations which open
 * a block and recursively inline the referenced child process. The type of each
 * relation is mapped to its string representation using the {@link relationsMap `relationsMap`}.
 * The child process is looked up in `allProcesses` by the relation's `target`
 * id and rendered by a recursive call with `numTabs + 1` to increase indentation.
 *
 * Indentation details:
 * - `numTabs` specifies the current nesting level. Spawned child content is
 *   indented by one additional tab relative to the parent. Newlines between
 *   child lines are joined using `"\n" + "\t".repeat(numTabs)` and a leading
 *   tab is added when pushing the child block, so each recursion level
 *   increases visual indentation by one tab character.
 *
 * @param process - The process to serialize.
 * @param allProcesses - Map of all available processes keyed by their id; used
 *   to resolve and inline spawned child processes.
 * @param numTabs - Current indentation depth (number of leading tab characters
 *   to consider when inlining child processes).
 * @returns An array of strings representing the rendered lines for the given
 *   process (events and relations), ready to be joined or further processed.
 */
function writeProcess(
  process: Process,
  allProcesses: Map<string, Process>,
  numTabs: number
): string[] {
  const content: string[] = [];

  content.push(...process.events.map(formatEvent));
  //process.events.forEach((event) => {
  //  content.push(formatEvent(event));
  //});

  if (process.relations.length > 0) content.push(";");

  process.relations.forEach((relation) => {
    if (relation.type === "spawn") {
      content.push(`${relation.source} ${relationsMap[relation.type]} {`);

      const childProcess = allProcesses.get(relation.target);
      if (childProcess) {
        const childContent = writeProcess(
          childProcess,
          allProcesses,
          numTabs + 1
        );
        const indentedChild = childContent.join(`\n${"\t".repeat(numTabs)}`);
        content.push(`\t${indentedChild}`, "}");
      }
    } else {
      const guardSuffix = relation.guard ? ` [${relation.guard}]` : "";
      content.push(
        `${relation.source} ${relationsMap[relation.type]} ${
          relation.target
        }${guardSuffix}`
      );
    }
  });

  return content;
}

/**
 * Formats an `Event` object into a single-line string representation used by the code generator.
 *
 * The produced string has the general shape:
 *   `<prefix>(<label>:<name>) (<security>) [<input-computation>] [<initiators> -> <receivers>]`
 *
 * where:
 * - prefix is composed from the event.marking:
 *   - if `marking.included` is false a leading '%' is emitted
 *   - if `marking.pending` is true a leading '!' is emitted
 *   (order: '%' then '!' when both apply)
 * - the event identity is emitted as "(label:name)"
 * - the security classification is emitted as "(security)"
 * - the payload slot is wrapped in square brackets:
 *   - if `event.input` is present, a leading '?' is emitted
 *     - if `input.type !== "Unit"` a ':' follows and then either:
 *       - a record is rendered as `{var1:Type1; var2:Type2; ...}`
 *       - or a primitive/alias type is emitted directly
 *   - otherwise, if `event.expression` is present it is emitted directly in the payload slot
 * - the second bracketed slot contains a comma-separated list of initiators
 *   followed (conditionally) by a receiver section when:
 *   - event.receivers is defined, has length > 0 and its first element is truthy.
 *
 * The function tolerates missing optional properties (input, expression, receivers) and
 * builds an appropriate, compact textual representation. No mutation or I/O is performed.
 *
 * @param event - The `Event` to format. Expected shape includes:
 *
 * @returns A formatted string describing the event suitable for code generation output.
 *
 * @see {@link Event `Event`}
 */
function formatEvent(event: Event): string {
  const { included, pending } = event.marking;
  const prefix = `${included ? "" : "%"}${pending ? "!" : ""}`;

  let eventContent = `${prefix}(${event.label}:${event.name}) (${event.security}) [`;

  if (event.input) {
    eventContent += "?";
    if (event.input.type !== "Unit") {
      eventContent += ":";
      if ("record" in event.input) {
        const fields = event.input.record
          .map((field) => `${field.var}:${field.type}`)
          .join("; ");
        eventContent += `{${fields}}`;
      } else eventContent += event.input.type;
    }
  } else if (event.expression) eventContent += event.expression;

  const receivers = event.receivers?.length
    ? event.receivers.length > 0 && event.receivers[0]
      ? ` -> ${event.receivers.join(", ")}`
      : ""
    : "";

  eventContent += `] [${event.initiators.join(", ")}${receivers}]`;

  return eventContent;
}
