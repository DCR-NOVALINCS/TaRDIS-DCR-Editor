import { Role } from "@/stores/roles-state";
import { Node, Edge } from "@xyflow/react";
import { splitArray } from "./utils";

const relationsMap: { [rel: string]: string } = {
  condition: "-->*",
  response: "*-->",
  include: "-->+",
  exclude: "-->%",
  milestone: "--<>",
  spawn: "-->>",
};

export type InputType =
  | { type: string }
  | { type: "Record"; record: { var: string; type: string }[] };

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

export function modifyRepresentation(
  code: string,
  eventMap: Map<string, string>
): Map<string, EventType> {
  let newEventMap = new Map<string, EventType>();
  const splitted = code.replace(/[\r\t]/g, "").split("\n");
  console.log(splitted, splitArray(splitted, ";"));
  const events = splitted.filter((elem) => elem.charAt(0) === "(");

  let i = 0;
  eventMap.forEach((ev, id) => {
    const event = events[i];
    let marking: MarkingType = {
      included: event.includes("%") ? false : true,
      pending: event.includes("!") ? true : false,
    };

    const eventSplitted = event
      .replace("; ", ";")
      .replace(", ", ",")
      .split(" ");

    console.log(eventSplitted);

    const labelName = eventSplitted[0]
      .replace("(", "")
      .replace(")", "")
      .split(":");
    const label = labelName[0];
    const name = labelName[1];

    const security = eventSplitted[1].replace("(", "").replace(")", "");

    let expression: string | undefined = undefined;
    let input: InputType | undefined = undefined;
    const inputCompt = eventSplitted[2].replace("[", "").replace("]", "");
    if (inputCompt.charAt(0) === "?") {
      if (inputCompt === "?") input = { type: "Unit" };
      else {
        const inputString = inputCompt.replace("?:", "");
        if (inputString.charAt(0) === "{") {
          const inputRecord = inputString.replace("{", "").replace("}", "");
          const recFields = inputRecord.split(";").map((rec) => {
            const recField = rec.split(":");
            return {
              var: recField[0],
              type: recField[1],
            };
          });
          input = { type: "Record", record: recFields };
        } else input = { type: inputString };
      }
    } else expression = inputCompt;

    let initiatorsString = eventSplitted[3];
    let initiators: string[] = [];
    let receivers: string[] = [];
    if (initiatorsString.includes("]"))
      initiators = initiatorsString
        .replace("[", "")
        .replace("]", "")
        .split(",");
    else {
      initiators = initiatorsString.replace("[", "").split(",");
      receivers = eventSplitted[5].replace("]", "").split(",");
    }

    newEventMap.set(id, {
      id: "",
      label,
      name,
      security,
      ...(input ? { input } : { expression }),
      initiators,
      ...(receivers.length > 0 && { receivers }),
      marking,
    });
    i++;
  });

  return newEventMap;
}

export default function writeCode(
  nodes: Node[],
  edges: Edge[],
  roles: Role[],
  lattice: string
): { eventMap: Map<string, string>; code: string } {
  const parentProcess = extractData(nodes, edges);
  let eventMap = new Map<string, string>();
  let content: string[] = [];

  function writeProcess(process: Process, numTabs: number): string[] {
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
    newContent.push(";");

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
