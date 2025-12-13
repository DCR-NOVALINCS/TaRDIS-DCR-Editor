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
} from "../gens/data-types/visualgen-types";
import { nextChar } from "../utils";

/**
 * Convert a `RoleExpr` AST node into a compact textual representation used by the visual generator.
 *
 * The function recognizes several shapes of `RoleExpr`:
 * - If the node has an `initiatorExpr` property it returns `@Initiator(<eventId>)`.
 * - If the node has a `receiverExpr` property it returns `@Receiver(<eventId>)`.
 * - If the node is a wrapper with a `roleExpr` property, it unwraps it and proceeds with the inner value.
 * - Otherwise it expects the node to contain a `roleLabel` and a `params` array and renders them as:
 *   `roleLabel(name1=value1; name2='value2'; ...)`
 *
 * Parameter value rendering rules:
 * - If `value` is absent, the parameter is rendered as `name=*`.
 * - If `value` contains `propDeref`, the helper `processPropDeref` is invoked and its result is used (`name=<propDerefResult>`).
 * - If `value` contains `intLit`, `floatLit`, or `boolLit`, the raw literal value is used (`name=123`, `name=1.23`, `name=true`).
 * - If `value` contains `stringLit`, the string literal is wrapped in single quotes (`name='text'`).
 *
 * Miscellaneous:
 * - Parameter order is preserved and parameters are joined with `"; "` inside the parentheses.
 * - The function is deterministic and has no side effects, but it expects a well-formed RoleExpr structure; unexpected shapes may produce runtime errors.
 *
 * @param roleExpr - The AST node representing a role expression.
 *
 * @returns A string representation of the role expression suitable for the visual generator.
 *
 * @see {@link RoleExpr `RoleExpr`}
 */
function processRoleExpr(roleExpr: RoleExpr): string {
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

/**
 * Convert a `DataType` descriptor into a visual/serialization-friendly shape.
 *
 * This function accepts a `DataType` which is expected to be one of:
 * - a primitive-like descriptor that contains a discriminant property `valueType`, or
 * - a record descriptor that contains a `recordType` with `fields`.
 *
 * Behavior:
 * - If `dataType` has a `valueType` property, the function maps that value to an
 *   object of the form:
 *     `{ input: { type: "<MappedTypeName>" } }`
 *   The mapping currently implemented is:
 *     - `"int"`    -> `"Integer"`
 *     - `"string"` -> `"String"`
 *     - `"void"`   -> `"Unit"`
 *     - `"bool"`   -> `"Boolean"`
 *     - `"float"`  -> `"Float"`
 *     - `"array"`  -> `"Array"`
 *
 * - If `dataType` does not have `valueType`, it is treated as a record with
 *   `dataType.recordType.fields`. Each field is mapped to an entry:
 *      `{ var: <field.name>, type: <MappedTypeName> }`
 *   and the function returns:
 *     `{ input: { type: "Record", record: [ <mapped fields> ] } }`
 *
 * @param dataType - The `DataType` to convert. Expected to be either a discriminated
 *                   primitive (with `valueType`) or a record (with `recordType.fields`).
 *
 * @returns An object describing the input type for visualization/serialization:
 *          - For primitives: `{ input: { type: "<MappedTypeName>" } }`
 *          - For records:   `{ input: { type: "Record", record: Array<{ var: string, type: string }> } }`
 *
 * @see {@link DataType `DataType`}
 */
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

/**
 * Convert a `PropBasedExpr` node into a dot-separated property path string.
 *
 * This function supports three shapes of the input AST-like node:
 * - An event reference shape: `{ eventRef: { value: string } }` — treated as the recursion base and returns the `eventRef.value`.
 * - A nested dereference shape: `{ propDeref: { propBasedExpr: PropBasedExpr, prop: string } }` — resolves the inner `propBasedExpr` recursively then appends the `prop`.
 * - A non-nested dereference shape: `{ propBasedExpr: PropBasedExpr, prop: string }` — resolves the inner `propBasedExpr` recursively then appends the `prop`.
 *
 * The implementation is recursive: it computes the base path for the inner `propBasedExpr`, then returns `${base}.${prop}` for dereference nodes.
 *
 * @param propDeref - The AST node representing either an event reference or a property dereference (type: `PropBasedExpr`).
 *
 * @returns A dot-separated string representing the full property access path (for example `"foo.bar.baz"`), or the event reference value for the base case.
 *
 * @see {@link PropBasedExpr `PropBasedExpr`}
 */
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

/**
 * Convert a parsed binary expression node into aN expression string.
 *
 * The function inspects the provided `BinaryOp` node and recursively converts
 * its left and right sub-expressions into strings, then combines them using
 * an operator corresponding to the node's `op` value.
 *
 * Supported sub-expression shapes (checked via discriminated properties):
 * - `propDeref`: converted via {@link processPropDeref `processPropDeref(...)`}
 * - `binaryOp`: recursively processed by {@link processBinaryOp `processBinaryOp(...)`}
 * - `intLit`, `floatLit`, `boolLit`: converted to their `.value` string
 * - `stringLit`: converted to a single-quoted string literal (`'...'`)
 *
 * Operator mapping:
 * - `"and"`       -> `&&`
 * - `"or"`        -> `||`
 * - `"equals"`    -> `==`
 * - `"notEquals"` -> `!=`
 * - `"intGreaterThan"` -> `>`
 * - `"intLessThan"`    -> `<`
 * - `"intAdd"`    -> `+`
 * - any other `op` value is used verbatim between the left and right strings
 *
 * @param binaryOp - The AST node representing a binary operation. Expected to
 *                    contain `expr1`, `expr2` (optional expression nodes) and
 *                    an `op` string indicating the operator.
 *
 * @returns A string containing the expression equivalent of the input binary operation.
 *
 * @see {@link BinaryOp `BinaryOp`}
 */
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

/**
 * Convert a discriminated `Expression` node into its textual representation.
 *
 * The function inspects the provided `Expression` (a union-like object) and
 * returns a string representation according to the expression kind:
 * - `binaryOp`: delegated to {@link processBinaryOp `processBinaryOp(...)`}
 * - `propDeref`: delegated to {@link processPropDeref `processPropDeref(...)`}
 * - `intLit`: the integer value converted with `toString()`
 * - `stringLit`: the string value wrapped in single quotes (no escaping performed)
 * - `boolLit`: the boolean value converted with `toString()`
 * - `floatLit`: the float value converted with `toString()`
 * - `record`: a brace-enclosed list of fields in the form "name=value" separated by "; "
 *
 * @param dataExpr - The AST `Expression` node to be converted to text.
 *
 * @returns A string representation of the expression suitable for embedding in
 *          the target textual format.
 *
 * @see {@link Expression `Expression`}
 */
function processDataExpr(dataExpr: Expression): string {
  if ("binaryOp" in dataExpr) return processBinaryOp(dataExpr.binaryOp);
  else if ("propDeref" in dataExpr) return processPropDeref(dataExpr.propDeref);
  else if ("intLit" in dataExpr) return dataExpr.intLit.value.toString();
  else if ("stringLit" in dataExpr) return `'${dataExpr.stringLit.value}'`;
  else if ("boolLit" in dataExpr) return dataExpr.boolLit.value.toString();
  else if ("floatLit" in dataExpr) return dataExpr.floatLit.value.toString();
  else if ("record" in dataExpr) {
    const fields = dataExpr.record.fields
      .map((field) => `${field.name}=${processDataExpr(field.value)}`)
      .join("; ");
    return `{${fields}}`;
  }
  return "";
}

/**
 * Processes an initial receive action between two roles and returns a string
 * representation for the sender ("first") and a collection of processed
 * expressions for the receivers ("collection").
 *
 * The function:
 * - Maps each {@link RoleExpr `RoleExpr`} in `second` through `processRoleExpr`.
 * - Builds a parameter mapping for `first.params`:
 *   - If any processed `second` expression references `params.<param.name>`,
 *     that parameter is aliased to a generated placeholder of the form `#<name> as <Char>`.
 *     The generated character sequence starts at "X" and is advanced using {@link nextChar `nextChar`}.
 *   - Otherwise the parameter is left as-is (mapped to its own name).
 * - Rewrites the processed `second` expressions to replace occurrences of
 *   self parameter references with their generated alias characters.
 * - Produces a string for the `first` role in one of two ways:
 *   - If `instantiationConstraint` is provided: the constraint is processed via
 *     `processDataExpr`, split on " && ", and used to produce `param=value` entries
 *     (values are taken from the alias mapping where applicable). The resulting
 *     entries are joined with "; " and placed inside `firstLabel(...)`.
 *   - If no `instantiationConstraint` is provided: the full alias/mapping values
 *     are joined with "; " and placed inside `firstLabel(...)`.
 *
 * @param first - The sender role whose label and parameters will be mapped.
 * @param second - Array of role expressions representing the receiving side;
 *                 each element is processed with `processRoleExpr`.
 * @param instantiationConstraint - Optional data expression used to determine
 *                                   concrete instantiation values for `first`'s parameters.
 *
 * @returns An object with:
 *  - first: A string representing the mapped sender label and its parameter list
 *           (e.g. `<label>(param1; #p as X; ...)`").
 *  - collection: An array of processed and rewritten receiver expressions (strings).
 *
 * @see {@link processRoleExpr `processRoleExpr`}
 */
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
    } else hasParam.set(param.name, param.name);
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

/**
 * Recursively counts the number of event entries in a choreography graph and in any graphs
 * reachable via relations that contain a `spawnRelation`.
 *
 * Iterates the provided {@link ChoreographyGraph `ChoreographyGraph`}, adds the length of its optional `events`
 * array (treating a missing `events` as zero), and for each relation that has a
 * `spawnRelation` property, recurses into `spawnRelation.graph` to include its events.
 *
 * @param graph - The choreography graph to traverse. May contain optional `events` and `relations` properties.
 *
 * @returns The total count of event entries in `graph` and all recursively spawned graphs. Returns 0 if no events are found.
 */
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

/**
 * Processes a choreography graph and converts it into flow editor nodes and edges.
 *
 * The function iterates over the graph's events and relations and produces a flat
 * list of visual nodes and edges suitable for a flow/canvas editor. It handles
 * three event kinds (`inputEvent`, `receiveEvent`, `computationEvent`) and two relation
 * kinds (`controlFlowRelation`, `spawnRelation`). Spawn relations are handled
 * recursively by invoking this function on the nested graph, producing a
 * subprocess node that contains the spawned nodes as children.
 *
 * Side effects and helpers:
 * - Calls external helper functions: `processInitRecv`, `processDataType`,
 *   `processDataExpr` and {@link processChoregraphyGraphChildren `processChoregraphyGraphChildren`} (expected to be defined
 *   in the same module).
 * - Uses a local `subprocessId` counter to generate unique subprocess ids and
 *   increments the numeric `graphId` for nested graphs when recursing.
 *
 * Node / Edge construction details:
 * - Event nodes:
 *   - `type`: "event"
 *   - `position`: `{ x: 0, y: 0 }`
 *   - `zIndex`: `10000`
 *   - `data` includes:
 *     - `initiators`: array (wrapped from `processInitRecv` output)
 *     - `receivers`: array (wrapped from `processInitRecv` output)
 *     - `type`: "i" | "c" (interaction/computation)
 *     - `label`, `name` (from `common.choreoElementUID` and `common.label`)
 *     - `marking`: `{ included: boolean, pending: boolean }`
 *     - optional fields from `processDataType` result (spread into data)
 *     - `expression`: for computation events, from `processDataExpr(dataExpr)`
 *     - `interactionType`: `"tx"` | `"rx"`
 * - Control flow edges:
 *   - `id`: `${relationType.charAt(0)}-${source}-${target}`
 *   - `type`: `relationType` (as provided)
 *   - `data`: `{ guard: "" }`
 *   - `zIndex`: `20000`
 * - Spawn relations:
 *   - Recursively produce `spawnNodes` and `spawnEdges` from nested graph
 *   - Create a subprocess node with id `s{subprocessId}-{graphId}` and extent
 *     set for children
 *   - Add a spawn edge from source to the subprocess id:
 *     - `id`: `s-${source}-${subId}`
 *     - `type`: `"spawn"`
 *     - `data`: `{ guard: "" }`
 *    - `zIndex`: `20000`
 *   - Nested nodes are attached as children (`parentId` set to the subprocess id),
 *     and their `extent` / `expandParent` flags are set for embedding.
 *
 * @param role - The {@link Role `Role`} context used when resolving initiators/receivers via processInitRecv.
 * @param graph - The {@link ChoreographyGraph `ChoreographyGraph`} to transform into editor nodes/edges.
 * @param graphId - A numeric identifier used when generating ids for nested graphs;
 *                  it is incremented when recursing into spawn relations.
 *
 * @returns An object containing:
 *   - `nodes`: `Node[]` — visual node representations for events and subprocesses.
 *   - `edges`: `Edge[]` — visual edge representations for control-flow and spawn relations.
 *
 * @see {@link Node `Node`}
 * @see {@link Edge `Edge`}
 * @see {@link processInitRecv `processInitRecv`}
 * @see {@link processDataType `processDataType`}
 * @see {@link processDataExpr `processDataExpr`}
 */
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

            console.log(dataExpr);

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

/**
 * Processes a choreography model by delegating to `processChoreographyGraph`.
 *
 * This function is a thin wrapper that extracts the top-level role and graph
 * from the supplied {@link ChoreographyModel `ChoreographyModel`} and begins processing at the initial
 * index (0).
 *
 * @param choregraphy - The choreography model to process. Must contain the
 *   `role` and `graph` properties expected by `processChoreographyGraph`.
 *
 * @returns The value returned by `processChoreographyGraph(choregraphy.role, choregraphy.graph, 0)`.
 *   The exact return type is the same as that of `processChoreographyGraph`.
 *
 * @remarks
 * - Processing starts at index 0 (root/start of the choreography graph).
 * - Any validation or transformation of `choregraphy.role` and `choregraphy.graph`
 *   is performed by `processChoreographyGraph`.
 *
 * @see {@link processChoreographyGraph `processChoreographyGraph`}
 */
export function processChoregraphyModel(choregraphy: ChoreographyModel) {
  return processChoreographyGraph(choregraphy.role, choregraphy.graph, 0);
}
