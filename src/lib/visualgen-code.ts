import { Edge, Node } from "@xyflow/react";
import {
  eventRegex,
  FieldType,
  InputType,
  MarkingType,
  Parameter,
  SimpleRole,
} from "./types";

type Graph = {
  roles: SimpleRole[];
  security: string;
  nodes: Node[];
  edges: Edge[];
  nodeId: number;
  subId: number;
};

let nodeId = 0;
let subId = 0;

function isValidType(type: string): boolean {
  return (
    type === "-->*" ||
    type === "*-->" ||
    type === "-->+" ||
    type === "-->%" ||
    type === "--><>" ||
    type === "-->>"
  );
}

function untilRegex(
  code: string,
  regex: string
): { part: string[]; code: string } {
  let str = code
    .replace(/[\r\t]/g, "")
    .split("\n")
    .reverse();
  let arr: string[] = [];
  let line = str.pop();
  while (line && line !== regex) {
    arr.push(line);
    line = str.pop();
  }

  return { part: arr, code: str.reverse().join("\n") };
}

function detectSubprocess(code: string): { part: string[]; code: string } {
  let str = code.split("\n").reverse();
  let arr: string[] = [];
  let line = str.pop();
  let jump = 0;
  let end = false;
  while (line && !end) {
    if (line.endsWith("{")) {
      jump++;
      arr.push(line);
      line = str.pop();
    } else if (line === "}") {
      if (jump > 0) {
        jump--;
        arr.push(line);
        line = str.pop();
      } else end = true;
    } else {
      arr.push(line);
      line = str.pop();
    }
  }

  return { part: arr, code: str.reverse().join("\n") };
}

function genRole(role: string): SimpleRole {
  const [roleLabel, roleParams] = role
    .replace(" ", "")
    .replace("(", " ")
    .replace(")", "")
    .replace(/\s{2,}/g, " ")
    .split(" ");

  const params: Parameter[] = roleParams
    ? roleParams.split(";").map((param) => {
        const [varName, type] = param.split(":");
        return { var: varName, type };
      })
    : [];

  return {
    role: roleLabel,
    label: roleLabel,
    types: params,
  };
}

function genGraph(
  code: string,
  parentId?: string,
  nds?: Node[],
  eds?: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  let result = untilRegex(code, ";");

  let nodes: Node[] = nds ? nds : [];
  for (const ev of result.part) {
    const match = eventRegex.exec(ev);

    if (match) {
      const eventInfo = match[1].replace(/\s/g, "") || "";
      const ifc = match[2].replace(/\s/g, "") || "";
      const typeInfo = match[3].replace(/\s/g, "") || "";
      const initRecv = match[4].replace(" -> ", "->") || "";

      const marking: MarkingType = {
        included: !ev.includes("%"),
        pending: ev.includes("!"),
      };
      const [label, name] = eventInfo
        .replace("!", "")
        .replace("%", "")
        .split(":");

      let type: string = "";
      let input: InputType | undefined = undefined;
      let expression: string = "";

      if (typeInfo.charAt(0) === "?") {
        type = "i";
        const inputStr = typeInfo.slice(2);

        if (inputStr) {
          if (inputStr.charAt(0) === "{") {
            const fields = inputStr
              .replace("{", "")
              .replace("}", "")
              .split(";");

            const recordFields: FieldType[] = fields.map((field) => {
              const [varName, fieldType] = field.split(":");
              return { var: varName, type: fieldType };
            });
            input = { type: "Record", record: recordFields };
          } else input = { type: inputStr };
        } else input = { type: "Unit" };
      } else {
        type = "c";
        expression = typeInfo;
      }

      const [initiators, receivers] = initRecv
        .replace("[", "")
        .replace("]", "")
        .split("->");

      nodes.push({
        id: `e${++nodeId}`,
        type: "event",
        data: {
          initiators: initiators.split(","),
          ...(receivers && { receivers: receivers.split(",") }),
          type,
          label,
          name,
          marking,
          ...(input && { input }),
          ...(expression && { expression }),
          security: ifc,
        },
        ...(parentId
          ? { parentId, expandParent: true, extent: "parent" }
          : { parentId: "" }),
        position: { x: 0, y: 0 },
        zIndex: 10000,
      });
    }
  }

  let edges: Edge[] = eds ? eds : [];
  let str = result.code.replace(/[\r\t]/g, "").split("\n");
  while (str.length > 0) {
    str = str.reverse();
    const line = str.pop();
    str = str.reverse();

    if (line) {
      if (line.endsWith("{")) {
        let trigger: Node | undefined = undefined;
        if (
          parentId &&
          nodes.some(
            (ev) =>
              ev.data.label === line.split(" ")[0] && ev.parentId === parentId
          )
        )
          trigger = nodes.find(
            (ev) =>
              ev.data.label === line.split(" ")[0] && ev.parentId === parentId
          );
        else trigger = nodes.find((ev) => ev.data.label === line.split(" ")[0]);

        if (!trigger) continue;
        const triggerId = trigger.id;

        const subprocessId = `s${subId++}`;

        const sub: Node = {
          id: subprocessId,
          position: { x: 0, y: 0 },
          width: 200,
          height: 200,
          type: "subprocess",
          ...(parentId
            ? { parentId, expandParent: true, extent: "parent" }
            : { parentId: "" }),
          data: {
            label: subprocessId,
            marking: {
              included: true,
              pending: false,
            },
          },
          zIndex: 1000,
        };

        const edge: Edge = {
          id: `s-${triggerId}-${subprocessId}`,
          type: "spawn",
          source: triggerId,
          target: subprocessId,
          data: {
            guard: "",
          },
          zIndex: 20000,
        };

        result = detectSubprocess(str.join("\n"));

        const { nodes: genNodes, edges: genEdges } = genGraph(
          result.part.join("\n"),
          subprocessId,
          nodes,
          edges
        );
        nodes = [sub, ...genNodes];
        edges = [edge, ...genEdges];

        str = result.code ? result.code.split("\n") : [""];
      } else {
        const [src, tp, tgt] = line
          .replace(/, /g, ",")
          .replace(/\s{2,}/g, " ")
          .split(" ");

        if (!src || !tp || !tgt || !isValidType(tp)) continue;

        const sources: string[] = [];
        const targets: string[] = [];

        src.split(",").forEach((sr) => {
          if (
            parentId &&
            nodes.some((ev) => ev.data.label === sr && ev.parentId === parentId)
          )
            sources.push(
              (
                nodes.find(
                  (ev) => ev.data.label === sr && ev.parentId === parentId
                ) as Node
              ).id
            );
          else if (nodes.some((ev) => ev.data.label === sr))
            sources.push((nodes.find((ev) => ev.data.label === sr) as Node).id);
        });

        tgt.split(",").map((tg) => {
          if (
            parentId &&
            nodes.some((ev) => ev.data.label === tg && ev.parentId === parentId)
          )
            targets.push(
              (
                nodes.find(
                  (ev) => ev.data.label === tg && ev.parentId === parentId
                ) as Node
              ).id
            );
          else if (nodes.some((ev) => ev.data.label === tg))
            targets.push((nodes.find((ev) => ev.data.label === tg) as Node).id);
        });

        let type: string = "";
        switch (tp) {
          case "-->*":
            type = "condition";
            break;
          case "*-->":
            type = "response";
            break;
          case "-->+":
            type = "include";
            break;
          case "-->%":
            type = "exclude";
            break;
          case "--><>":
            type = "milestone";
            break;
        }

        sources.forEach((source) => {
          targets.forEach((target) => {
            edges.push({
              id: `${type.charAt(0)}-${source}-${target}`,
              type,
              source,
              target,
              data: {
                guard: "",
              },
              zIndex: 20000,
            });
          });
        });
      }
    }
  }

  return { nodes, edges };
}

function cleanCode(code: string): string {
  let codeClean: string[] = [];
  code
    .replace(/\r\t/g, "")
    .split("\n")
    .forEach((line) => {
      if (line && line.trim() && !line.startsWith("//"))
        codeClean.push(line.trim());
    });

  return codeClean.join("\n");
}

export function visualGen(code: string): Graph {
  let result = untilRegex(cleanCode(code), ";");
  const roles: SimpleRole[] = result.part.map((role) => genRole(role));

  result = untilRegex(result.code, ";");
  const security = result.part.join("\n");

  nodeId = 0;
  subId = 0;
  const { nodes, edges } = genGraph(result.code);

  return { roles, security, nodes, edges, nodeId, subId };
}
