import { type Node, type Edge } from "@xyflow/react";

import {
  type RoleExpr,
  type DataType,
  type PropBasedExpr,
  type Expression,
  BinaryOp,
  Role,
  ChoreographyGraph,
  ChoreographyModel,
} from "./types";
import { nextChar } from "./utils";

function processRoleExpr(roleExpr: RoleExpr): string {
  console.log(roleExpr);
  let roleLabel, params;
  if ("initiatorExpr" in roleExpr)
    return `@Initiator(${roleExpr.initiatorExpr.eventId})`;
  else if ("receiverExpr" in roleExpr)
    return `@Receiver(${roleExpr.receiverExpr.eventId})`;
  else if ("roleExpr" in roleExpr) {
    roleLabel = roleExpr.roleExpr.roleLabel;
    params = roleExpr.roleExpr.params;
  } else {
    roleLabel = roleExpr.roleLabel;
    params = roleExpr.params;
  }
  const paramsString = params.map((param) => {
    const { name, value } = param;
    console.log(param);
    if (value) {
      if ("propDeref" in value)
        return `${name}=${processPropDeref(value.propDeref)}`;
      else if ("intLit" in value) return `${name}=${value.intLit.value}`;
      else if ("stringLit" in value)
        return `${name}='${value.stringLit.value}'`;
      else if ("boolLit" in value) return `${name}=${value.boolLit.value}`;
      else if ("floatLit" in value) return `${name}=${value.floatLit.value}`;
    } else return `${name}=*`;
  });

  return `${roleLabel}(${paramsString.join("; ")})`;
}

function processDataType(dataType: DataType) {
  if ("valueType" in dataType) {
    switch (dataType.valueType) {
      case "int":
        return { input: { type: "Integer" } };
      case "string":
        return { input: { type: "String" } };
      case "void":
        return { input: { type: "Unit" } };
      case "bool":
        return { input: { type: "Boolean" } };
      case "float":
        return { input: { type: "Float" } };
      case "array":
        return { input: { type: "Array" } };
    }
  } else {
    const fields = dataType.recordType.fields.map((field) => {
      switch (field.type.valueType) {
        case "int":
          return { var: field.name, type: "Integer" };
        case "string":
          return { var: field.name, type: "String" };
        case "bool":
          return { var: field.name, type: "Boolean" };
        case "float":
          return { var: field.name, type: "Float" };
        case "array":
          return { var: field.name, type: "Array" };
      }
    });
    return { input: { type: "Record", record: fields } };
  }
}

function processPropDeref(propDeref: PropBasedExpr): string {
  if ("eventRef" in propDeref) return propDeref.eventRef.value;

  let propBasedExpr, prop;
  if ("propDeref" in propDeref) {
    propBasedExpr = propDeref.propDeref.propBasedExpr;
    prop = propDeref.propDeref.prop;
  } else {
    propBasedExpr = propDeref.propBasedExpr;
    prop = propDeref.prop;
  }

  const base = processPropDeref(propBasedExpr);

  return `${base}.${prop}`;
}

function processBinaryOp(binaryOp: BinaryOp): string {
  const { expr1, expr2, op } = binaryOp;
  let left: string = "";
  let right: string = "";

  if (expr1) {
    if ("propDeref" in expr1) left = processPropDeref(expr1.propDeref);
    else if ("binaryOp" in expr1) left = processBinaryOp(expr1.binaryOp);
    else if ("intLit" in expr1) left = expr1.intLit.value.toString();
    else if ("stringLit" in expr1) left = `'${expr1.stringLit.value}'`;
    else if ("boolLit" in expr1) left = expr1.boolLit.value.toString();
    else if ("floatLit" in expr1) left = expr1.floatLit.value.toString();
  }

  if (expr2) {
    if ("propDeref" in expr2) right = processPropDeref(expr2.propDeref);
    else if ("binaryOp" in expr2) right = processBinaryOp(expr2.binaryOp);
    else if ("intLit" in expr2) right = expr2.intLit.value.toString();
    else if ("stringLit" in expr2) right = `'${expr2.stringLit.value}'`;
    else if ("boolLit" in expr2) right = expr2.boolLit.value.toString();
    else if ("floatLit" in expr2) right = expr2.floatLit.value.toString();
  }

  switch (op) {
    case "and":
      return `${left} && ${right}`;
    case "or":
      return `${left} || ${right}`;
    case "equals":
      return `${left} == ${right}`;
    case "notEquals":
      return `${left} != ${right}`;
    case "intGreaterThan":
      return `${left} > ${right}`;
    case "intLessThan":
      return `${left} < ${right}`;
    case "intAdd":
      return `${left} + ${right}`;
    default:
      return `${left} ${op} ${right}`;
  }
}

function processDataExpr(dataExpr: Expression): string {
  if ("binaryOp" in dataExpr) return processBinaryOp(dataExpr.binaryOp);
  else if ("propDeref" in dataExpr) return processPropDeref(dataExpr.propDeref);
  else if ("intLit" in dataExpr) return dataExpr.intLit.value.toString();
  else if ("stringLit" in dataExpr) return `'${dataExpr.stringLit.value}'`;
  else if ("boolLit" in dataExpr) return dataExpr.boolLit.value.toString();
  else if ("floatLit" in dataExpr) return dataExpr.floatLit.value.toString();
  return "";
}

function processInitRecv(
  first: Role,
  second: RoleExpr[],
  instantiationConstraint?: Expression
) {
  let secondMapped = second.map((sec) => processRoleExpr(sec));
  let hasParam = new Map<string, string>();
  let firstChar = "X";

  first.params.forEach((param) => {
    if (secondMapped.some((sec) => sec.includes(`params.${param.name}`))) {
      hasParam.set(
        `_@self.params.${param.name}`,
        `#${param.name} as ${firstChar}`
      );
      firstChar = nextChar(firstChar);
    } else hasParam.set(param.name, `#${param.name}`);
  });

  secondMapped = secondMapped.map((sec) => {
    let res = sec;
    hasParam.forEach((v, k) => {
      if (k.includes("self") && sec.includes(k))
        res = res.replace(k, v.split(" as ")[1]);
    });
    return res;
  });

  let firstMapped = first.label + "(x)";
  if (instantiationConstraint) {
    const insCons = processDataExpr(instantiationConstraint).split(" && ");
    const newParams = first.params.map((param) => {
      let part: string = "";
      insCons.forEach((cons) => {
        const consSplitted = cons.split(" ");
        if (consSplitted[0].includes(param.name)) {
          if (consSplitted[1] === "==") {
            const paramMap = hasParam.get(consSplitted[2]);
            part = paramMap
              ? `${param.name}=${hasParam.get(consSplitted[2])}`
              : `${param.name}=${consSplitted[2]}`;
          } else {
            const hasParamRes = hasParam.get(param.name);
            part = hasParamRes ? hasParamRes : "";
          }
        }
      });
      return part;
    });
    firstMapped = `${first.label}(${newParams.join("; ")})`;
  } else {
    let hasParamJoined: string[] = [];
    hasParam.forEach((v) => {
      hasParamJoined.push(v);
    });
    firstMapped = `${first.label}(${hasParamJoined.join("; ")})`;
  }

  return { first: firstMapped, collection: secondMapped };
}

function processChoregraphyGraphChildren(graph: ChoreographyGraph) {
  const { events, relations } = graph;

  let length = 0;
  if (events) length += events.length;
  if (relations) {
    relations.forEach((relation) => {
      if ("spawnRelation" in relation)
        length += processChoregraphyGraphChildren(relation.spawnRelation.graph);
    });
  }

  return length;
}

function processChoreographyGraph(
  role: Role,
  graph: ChoreographyGraph,
  graphId: number
) {
  const { events, relations } = graph;

  let subprocessId = 0;
  let nodes: Node[] =
    events && events.length > 0
      ? events.map((event) => {
          if ("inputEvent" in event) {
            const { common, receivers } = event.inputEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
              instantiationConstraint,
            } = common;

            const { first: inits, collection: recvs } = processInitRecv(
              role,
              receivers,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [inits],
                receivers: recvs,
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                interactionType: "tx",
              },
              parentId: "",
              zIndex: 10000,
            };
          } else if ("receiveEvent" in event) {
            const { common, initiators } = event.receiveEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
              instantiationConstraint,
            } = common;

            const { first: recvs, collection: inits } = processInitRecv(
              role,
              initiators,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [recvs],
                receivers: inits,
                type: "i",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                interactionType: "rx",
              },
              parentId: "",
              zIndex: 10000,
            };
          } else {
            const { common, dataExpr, receivers } = event.computationEvent;
            const {
              choreoElementUID: label,
              endpointElementUID: id,
              dataType,
              label: name,
              marking,
              instantiationConstraint,
            } = common;

            const { first: inits, collection: recvs } = processInitRecv(
              role,
              receivers,
              instantiationConstraint
            );

            const input = processDataType(dataType);

            return {
              id,
              type: "event",
              position: { x: 0, y: 0 },
              data: {
                initiators: [inits],
                receivers: recvs,
                type: "c",
                label,
                name,
                marking: {
                  included: marking.isIncluded,
                  pending: marking.isPending,
                },
                ...(input ? input : {}),
                expression: processDataExpr(dataExpr),
                interactionType: "tx",
              },
              parentId: "",
              zIndex: 10000,
            };
          }
        })
      : [];

  let edges: Edge[] = [];
  if (relations) {
    relations.forEach((relation) => {
      if ("controlFlowRelation" in relation) {
        const {
          relationCommon,
          relationType: type,
          targetId: target,
        } = relation.controlFlowRelation;
        const { sourceId: source } = relationCommon;

        edges.push({
          id: `${type.charAt(0)}-${source}-${target}`,
          source,
          target,
          type,
          data: {
            guard: "",
          },
          zIndex: 20000,
        });
      } else {
        const { relationCommon, graph } = relation.spawnRelation;
        const { sourceId: source } = relationCommon;
        const { nodes: spawnNodes, edges: spawnEdges } =
          processChoreographyGraph(role, graph, ++graphId);

        const subId = `s${subprocessId++}-${graphId}`;
        const childrenLength = processChoregraphyGraphChildren(graph);
        const subprocess: Node = {
          id: subId,
          position: { x: 0, y: 0 },
          width: childrenLength * 150,
          height: childrenLength * 150,
          type: "subprocess",
          parentId: "",
          data: {
            label: subId,
            marking: {
              included: true,
              pending: false,
            },
          },
          zIndex: 1000,
        };
        nodes = [
          ...nodes,
          subprocess,
          ...spawnNodes.map((nd) => ({
            ...nd,
            parentId: nd.parentId ? nd.parentId : subprocess.id,
            expandParent: true,
            extent: "parent" as const,
          })),
        ];
        edges = [
          ...edges,
          {
            id: `s-${source}-${subId}`,
            source,
            target: subprocess.id,
            type: "spawn",
            data: {
              guard: "",
            },
            zIndex: 20000,
          },
          ...spawnEdges,
        ];
      }
    });
  }

  return { nodes, edges };
}

export function processChoregraphyModel(choregraphy: ChoreographyModel) {
  const { role, graph } = choregraphy;
  const { nodes, edges } = processChoreographyGraph(role, graph, 0);
  console.log(nodes, edges);
  return { nodes, edges };
}
