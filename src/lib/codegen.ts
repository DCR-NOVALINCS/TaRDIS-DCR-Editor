import { Node, Edge } from "@xyflow/react";
import {
  type EventType,
  type NestType,
  type SubprocessType,
  Process,
  relationsMap,
  RelationType,
  SimpleRole,
} from "./types";

type ProcessNode = EventType | NestType | SubprocessType;

/**
 * Extracts and organizes process-related data from provided nodes and edges.
 *
 * This function processes arrays of nodes and edges, categorizing them into events, nests,
 * subprocesses, and relations. It then groups these elements by their parent relationships,
 * constructing a hierarchical map of processes.
 */
function extractData(nodes: Node[], edges: Edge[]): Map<string, Process> {
  const { events, nests, subprocesses } = categorizeNodes(nodes);
  const relations = processEdges(edges, events, nests, subprocesses);

  return buildProcessHierarchy(events, nests, subprocesses, relations);
}

/**
 * Categorizes nodes into events, nests, and subprocesses
 */
function categorizeNodes(nodes: Node[]) {
  const events: EventType[] = nodes
    .filter((n) => n.type === "event")
    .map((n) => createEventFromNode(n));

  const nests: NestType[] = nodes
    .filter((n) => n.type === "nest")
    .map((n) => createNestFromNode(n));

  const subprocesses: SubprocessType[] = nodes
    .filter((n) => n.type === "subprocess")
    .map((n) => createSubprocessFromNode(n));

  return { events, nests, subprocesses };
}

/**
 * Creates an EventType from a node
 */
function createEventFromNode(node: Node): EventType {
  const { id, data, parentId } = node as {
    id: string;
    data: Record<string, unknown>;
    parentId: string;
  };

  const {
    label,
    name,
    security,
    input,
    expression,
    initiators,
    receivers,
    marking,
  } = data as EventType;

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
 * Creates a NestType from a node
 */
function createNestFromNode(node: Node): NestType {
  const { id, data, parentId } = node as {
    id: string;
    data: Record<string, unknown>;
    parentId: string;
  };

  const { label, marking, nestType } = data as NestType;

  return {
    id,
    label,
    marking,
    nestType,
    parent: parentId || "global",
  };
}

/**
 * Creates a SubprocessType from a node
 */
function createSubprocessFromNode(node: Node): SubprocessType {
  const { id, data, parentId } = node as {
    id: string;
    data: Record<string, unknown>;
    parentId: string;
  };

  const { label, marking } = data as SubprocessType;

  return {
    id,
    label,
    marking,
    parent: parentId || "global",
  };
}

/**
 * Gets all child events recursively from a nest or subprocess
 */
function getChildrenEvents(
  node: NestType | SubprocessType,
  events: EventType[],
  nests: NestType[],
  subprocesses: SubprocessType[]
): { events: EventType[]; parent: string }[] {
  const directChildEvents = events.filter((e) => e.parent === node.id);
  const childNests = nests.filter((n) => n.parent === node.id);
  const childSubprocesses = subprocesses.filter((s) => s.parent === node.id);

  let allChildren = [{ events: directChildEvents, parent: node.id }];

  // Recursively get children from nests and subprocesses
  [...childNests, ...childSubprocesses].forEach((child) => {
    allChildren.push(...getChildrenEvents(child, events, nests, subprocesses));
  });

  return allChildren;
}

/**
 * Processes edges to create relations
 */
function processEdges(
  edges: Edge[],
  events: EventType[],
  nests: NestType[],
  subprocesses: SubprocessType[]
): RelationType[] {
  const relations: RelationType[] = [];

  edges.forEach((edge) => {
    const { id, source, target, type, data } = edge;
    const guard = (data as { guard?: string })?.guard;

    const sourceNode = findNode(source, events, nests, subprocesses);
    const targetNode = findNode(target, events, nests, subprocesses);

    if (!sourceNode || !targetNode) return;

    const edgeRelations = createRelationsForEdge({
      id,
      source,
      target,
      type: type ?? "",
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
 * Finds a node by ID in any of the node arrays
 */
function findNode(
  id: string,
  events: EventType[],
  nests: NestType[],
  subprocesses: SubprocessType[]
): ProcessNode | undefined {
  return (
    events.find((n) => n.id === id) ||
    nests.find((n) => n.id === id) ||
    subprocesses.find((n) => n.id === id)
  );
}

/**
 * Creates relations for a single edge
 */
function createRelationsForEdge({
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
}: {
  id: string;
  source: string;
  target: string;
  type: string;
  guard?: string;
  sourceNode: ProcessNode;
  targetNode: ProcessNode;
  events: EventType[];
  nests: NestType[];
  subprocesses: SubprocessType[];
}): RelationType[] {
  const relations: RelationType[] = [];

  // Handle spawn relations specially
  if (type === "spawn")
    return [
      {
        id,
        source: sourceNode.label,
        target: targetNode.label,
        type,
        parent: sourceNode.parent,
        ...(guard && { guard }),
      },
    ];

  const isSourceEvent = events.some((e) => e.id === source);
  const isTargetEvent = events.some((e) => e.id === target);

  if (isSourceEvent && isTargetEvent) {
    // Event to Event
    relations.push({
      id,
      source: sourceNode.label,
      target: targetNode.label,
      type,
      parent: sourceNode.parent,
      ...(guard && { guard }),
    });
  } else if (isSourceEvent && !isTargetEvent) {
    // Event to Container (Nest/Subprocess)
    const targetChildren = getChildrenEvents(
      targetNode as NestType | SubprocessType,
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
          parent: child.parent,
          ...(guard && { guard }),
        });
      });
    });
  } else if (!isSourceEvent && isTargetEvent) {
    // Container to Event
    const sourceChildren = getChildrenEvents(
      sourceNode as NestType | SubprocessType,
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
          parent: child.parent,
          ...(guard && { guard }),
        });
      });
    });
  } else {
    // Container to Container
    const sourceChildren = getChildrenEvents(
      sourceNode as NestType | SubprocessType,
      events,
      nests,
      subprocesses
    );
    const targetChildren = getChildrenEvents(
      targetNode as NestType | SubprocessType,
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
              parent: sourceChild.parent,
              ...(guard && { guard }),
            });
          });
        });
      });
    });
  }

  // Return placeholder for non-spawn relations (they're expanded above)
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
 * Finds the ultimate parent process for a node
 */
function findUltimateParent(
  item: ProcessNode | RelationType,
  nests: NestType[],
  subprocesses: SubprocessType[]
): string {
  if (!item.parent || item.parent === "global") return "global";

  const nestParent = nests.find((n) => n.id === item.parent);
  if (nestParent) return findUltimateParent(nestParent, nests, subprocesses);

  const subprocessParent = subprocesses.find((s) => s.id === item.parent);
  return subprocessParent ? item.parent : "global";
}

/**
 * Builds the process hierarchy map
 */
function buildProcessHierarchy(
  events: EventType[],
  nests: NestType[],
  subprocesses: SubprocessType[],
  relations: RelationType[]
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
 * Generates code from process structure
 */
export function writeCode(
  nodes: Node[],
  edges: Edge[],
  roles: SimpleRole[],
  lattice: string
): string {
  const parentProcess = extractData(nodes, edges);
  const content: string[] = [];

  // Write roles
  roles.forEach((role) => {
    let roleContent = role.label;
    if (role.types.length > 0) {
      const typeParams = role.types
        .map((type) => `${type.var}:${type.type}`)
        .join("; ");
      roleContent += `(${typeParams})`;
    }
    content.push(roleContent);
  });

  content.push(";", lattice, ";");

  // Write global process
  const globalProcess = parentProcess.get("global");
  if (globalProcess)
    content.push(writeProcess(globalProcess, parentProcess, 1).join("\n"));

  return content.join("\n");
}

/**
 * Writes a single process to string format
 */
function writeProcess(
  process: Process,
  allProcesses: Map<string, Process>,
  numTabs: number
): string[] {
  const content: string[] = [];

  // Write events
  process.events.forEach((event) => {
    content.push(formatEvent(event));
  });

  if (process.relations.length > 0) content.push(";");

  // Write relations
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
 * Formats an event to its string representation
 */
function formatEvent(event: EventType): string {
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
    ? ` -> ${event.receivers.join(", ")}`
    : "";

  eventContent += `] [${event.initiators.join(", ")}${receivers}]`;

  return eventContent;
}
