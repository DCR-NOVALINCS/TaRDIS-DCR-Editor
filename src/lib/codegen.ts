import { Role } from "@/stores/roles-state";
import { Node, Edge } from "@xyflow/react";
import { splitArray } from "./utils";

export const simpleInputTypes = ["Integer", "String", "Boolean"];
export const inputTypes = [...simpleInputTypes, "Record", "Unit"]; // "Reference" type not considered yet

const relationsMap: { [rel: string]: string } = {
  condition: "-->*",
  response: "*-->",
  include: "-->+",
  exclude: "-->%",
  milestone: "--<>",
  spawn: "-->>",
};

export type FieldType = { var: string; type: string };

export type InputType =
  | { type: string }
  | { type: "Record"; record: FieldType[] };

export type MarkingType = {
  included: boolean;
  pending: boolean;
};

export type EventType = {
  id: string;
  label: string;
  name: string;
  security: string;
  input?: InputType;
  expression?: string;
  initiators: string[];
  receivers?: string[];
  marking: MarkingType;
  parent?: string;
};

export type SubprocessType = {
  id: string;
  label: string;
  children: string[];
  marking: MarkingType;
  parent?: string;
};

export type NestType = SubprocessType & {
  nestType: string;
};

export interface RelationType {
  id: string;
  source: string;
  target: string;
  type: string;
  parent?: string;
  guard?: string;
}

interface Process {
  events: EventType[];
  relations: RelationType[];
  nests?: NestType[];
  subprocesses?: SubprocessType[];
  parentProcess: string;
}

/**
 * Extracts and organizes process-related data from provided nodes and edges.
 *
 * This function processes arrays of nodes and edges, categorizing them into events, nests,
 * subprocesses, and relations. It then groups these elements by their parent relationships,
 * constructing a hierarchical map of processes. Each process contains its associated events,
 * relations, nests, and subprocesses, as well as a reference to its parent process.
 *
 * @param nodes - An array of node objects representing events, nests, and subprocesses.
 * @param edges - An array of edge objects representing relations between nodes.
 * @returns A Map where each key is a process ID and each value is a Process object containing
 *          the grouped events, relations, nests, subprocesses, and parent process reference.
 */
function extractData(nodes: Node[], edges: Edge[]) {
  let parentProcess = new Map<string, Process>();

  const events: EventType[] = nodes
    .filter((n) => n.type === "event")
    .map((n) => {
      const {
        id,
        data,
        parentId: parent,
      } = n as {
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
        ...(input && { input }),
        ...(expression && { expression }),
        initiators,
        ...(receivers && receivers.length > 0 && { receivers }),
        marking,
        ...(parent && { parent }),
      };
    });

  const nests: NestType[] = nodes
    .filter((n) => n.type === "nest")
    .map((n) => {
      const {
        id,
        data,
        parentId: parent,
      } = n as { id: string; data: Record<string, unknown>; parentId: string };
      const { label, children, marking, nestType } = data as NestType;

      return {
        id,
        label,
        children,
        marking,
        nestType,
        ...(parent && { parent }),
      };
    });

  const subprocesses: SubprocessType[] = nodes
    .filter((n) => n.type === "subprocess")
    .map((n) => {
      const {
        id,
        data,
        parentId: parent,
      } = n as { id: string; data: Record<string, unknown>; parentId: string };
      const { label, children, marking } = data as SubprocessType;

      return {
        id,
        label,
        children,
        marking,
        ...(parent && { parent }),
      };
    });

  const relations: RelationType[] = edges.map((e) => {
    const { id, source, target, type, data } = e as {
      id: string;
      source: string;
      target: string;
      type: string;
      data: Record<string, unknown>;
    };
    const { guard } = data as { guard: string | undefined };

    const sourceEventNode = events.find((n) => n.id === source);
    const sourceNestNode = nests.find((n) => n.id === source);
    const sourceSubprocessNode = subprocesses.find((n) => n.id === source);

    const targetEventNode = events.find((n) => n.id === target);
    const targetNestNode = nests.find((n) => n.id === target);
    const targetSubprocessNode = subprocesses.find((n) => n.id === target);

    const sourceNode = sourceEventNode
      ? (sourceEventNode as EventType)
      : sourceNestNode
      ? (sourceNestNode as NestType)
      : (sourceSubprocessNode as SubprocessType);
    const targetNode = targetEventNode
      ? (targetEventNode as EventType)
      : targetNestNode
      ? (targetNestNode as NestType)
      : (targetSubprocessNode as SubprocessType);
    const parent = sourceNode.parent;

    return {
      id,
      source: sourceNode.label,
      target: targetNode.label,
      type,
      ...(parent && { parent }),
      ...(guard && { guard }),
    };
  });

  const parents: { id: string; parent: string }[] = [
    { id: "global", parent: "" },
    ...nests.map((n) => ({ id: n.id, parent: n.parent ? n.parent : "global" })),
    ...subprocesses.map((s) => ({
      id: s.id,
      parent: s.parent ? s.parent : "global",
    })),
  ];

  parents.forEach((parent, i) => {
    const { id, parent: upParent } = parent;
    let processEvents: EventType[] = [];
    let processRelations: RelationType[] = [];
    let processNests: NestType[] = [];
    let processSubprocesses: SubprocessType[] = [];

    if (i === 0) {
      processEvents = events.filter((e) => !e.parent);
      processRelations = relations.filter((r) => !r.parent);
      processNests = nests.filter((n) => !n.parent);
      processSubprocesses = subprocesses.filter((s) => !s.parent);
    } else {
      processEvents = events.filter((e) => e.parent && e.parent === id);
      processRelations = relations.filter((r) => r.parent && r.parent === id);
      processNests = nests.filter((n) => n.parent && n.parent === id);
      processSubprocesses = subprocesses.filter(
        (s) => s.parent && s.parent === id
      );
    }

    parentProcess.set(id, {
      events: processEvents,
      relations: processRelations,
      nests: processNests,
      subprocesses: processSubprocesses,
      parentProcess: upParent,
    });
  });

  return parentProcess;
}

/**
 * Generates code and an event mapping from a set of process nodes, edges, roles, and a security lattice.
 *
 * This function traverses the provided process structure, serializes events and relations into a custom
 * code format, and constructs a mapping from event IDs to their string representations. It also serializes
 * role definitions and the security lattice.
 *
 * @param nodes - The list of process nodes to be included in the code generation.
 * @param edges - The list of edges representing relations between nodes.
 * @param roles - The list of roles, each with associated types, to be serialized.
 * @param lattice - The security lattice definition as a string.
 * @returns An object containing:
 *   - `eventMap`: A mapping from event IDs to their string representations.
 *   - `code`: The generated code as a string.
 */
export function writeCode(
  nodes: Node[],
  edges: Edge[],
  roles: Role[],
  lattice: string
): { eventMap: Map<string, string>; code: string } {
  const parentProcess = extractData(nodes, edges);
  let eventMap = new Map<string, string>();
  let content: string[] = [];

  function writeProcess(process: Process, numTabs: number): string[] {
    console.log(process);
    let newContent: string[] = [];
    process.events.forEach((e) => {
      const { included, pending } = e.marking;
      let eventContent = `${included ? "" : "%"}${pending ? "!" : ""}(${
        e.label
      }:${e.name}) (${e.security}) [`;

      if (e.input) {
        eventContent += "?";
        const input = e.input;
        if (input.type !== "Unit") {
          eventContent += ":";
          if ("record" in input) {
            eventContent += "{";
            input.record.forEach((field, index) => {
              if (index === input.record.length - 1)
                eventContent += `${field.var}:${field.type}}`;
              else eventContent += `${field.var}:${field.type}; `;
            });
          } else {
            eventContent += `${input.type}`;
          }
        }
      } else if (e.expression) eventContent += `${e.expression}`;
      eventContent += `] [${e.initiators.join(", ")}${
        e.receivers ? ` -> ${e.receivers.join(", ")}]` : "]"
      }`;

      eventMap.set(e.id, eventContent);
      newContent.push(eventContent);
    });
    if (process.relations.length > 0) newContent.push(";");

    process.relations.forEach((r) => {
      if (r.type === "spawn") {
        newContent.push(`${r.source} ${relationsMap[r.type]} {`);
        const childProcess = parentProcess.get(r.target);
        if (childProcess) {
          let i = 0;
          let tabs = "";
          while (i < numTabs) {
            tabs += "\t";
            i++;
          }

          newContent.push(
            `\t${writeProcess(childProcess, numTabs + 1).join(`\n${tabs}`)}`
          );

          newContent.push("}");
        }
      } else {
        newContent.push(
          `${r.source} ${relationsMap[r.type]} ${r.target}${
            r.guard ? ` [${r.guard}]` : ""
          }`
        );
      }
    });

    return newContent;
  }

  roles.forEach((role) => {
    let roleContent = `${role.label}`;

    if (role.types.length > 0) {
      roleContent += "(";
      role.types.forEach((value, index) => {
        if (index === role.types.length - 1)
          roleContent += `${value.var}:${value.type})`;
        else roleContent += `${value.var}:${value.type}; `;
      });
    }
    content.push(roleContent);
  });
  content.push(";");
  content.push(lattice);
  content.push(";");

  const globalProcess = parentProcess.get("global");
  if (globalProcess) content.push(writeProcess(globalProcess, 1).join("\n"));

  return { eventMap, code: content.join(`\n`) };
}
