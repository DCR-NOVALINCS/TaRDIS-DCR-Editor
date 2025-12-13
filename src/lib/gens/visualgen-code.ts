import { Edge, Node } from "@xyflow/react";
import {
  CodeSplit,
  DCRGraph,
  relationsMap,
  eventRegex,
} from "./data-types/visualgen-types";
import { Field, Input, Marking, Role } from "./data-types/codegen-types";

let nodeId = 0;
let subId = 0;

/**
 * Determines whether a provided relationship type string matches one of the supported DCR arrow types.
 *
 * @param type - The relationship type string to validate.
 * @returns True if `type` exactly equals one of the supported literals ("-->*", "*-->", "-->+", "-->%", "--><>", "-->>"); otherwise false.
 */
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

/**
 * Iterates through the given source text line-by-line from the beginning and
 * collects all lines up to (but not including) the first line that is exactly
 * equal to the provided `matchLine` string.
 *
 * @param code - The source text to scan. It will be normalized by removing `\r` and `\t` and splitting on `\n`.
 * @param matchLine - A literal line value to stop at. Comparison is strict equality with each line.
 *
 * @returns A {@link CodeSplit `CodeSplit`} object with:
 *   - `part`: an array of lines (strings) that were found before the matching line, in their original order.
 *   - `code`: the remaining text after the matched line (the matched line itself is excluded). If the match is not found,
 *     `part` contains all lines and `code` is an empty string.
 *
 * @remarks
 * - If the first line matches `matchLine`, `part` will be empty and `code` will contain the remaining lines (excluding the matched line).
 * - If `matchLine` is never found, all lines are returned in `part` and `code` is an empty string.
 * - Empty lines are treated as regular lines. If `matchLine` is an empty string, the first empty line will cause scanning to stop.
 */
function untilMatch(code: string, matchLine: string): CodeSplit {
  let str = code
    .replace(/[\r\t]/g, "")
    .split("\n")
    .reverse();
  let arr: string[] = [];
  let line = str.pop();
  while (line && line !== matchLine) {
    arr.push(line);
    line = str.pop();
  }

  return { part: arr, code: str.reverse().join("\n") };
}

/**
 * Extracts the first top-level block (a "subprocess") from the given source text.
 *
 * The function:
 * - Splits the input into lines and iterates from the start.
 * - Collects lines into the returned `part` array until it encounters a top-level closing
 *   brace (`}`) that is not matched by a previously seen opening brace.
 * - Treats a line that ends with `{` as an opening brace (increments an internal nesting counter),
 *   and a line that is exactly `}` as a closing brace (decrements the counter or ends the collection
 *   when the counter is zero).
 * - Consumes the terminating top-level `}` (it is removed and not included in either `part` or the
 *   remaining `code`).
 *
 * Notes and caveats:
 * - The detection is line-oriented and sensitive to formatting:
 *   - An opening brace must appear at the end of a line (`line.endsWith("{")`) to be considered.
 *   - A closing brace must match exactly the string "}" (no surrounding whitespace) to be considered.
 *   - Variations like " { " or "}\t" will not be treated as braces by this implementation.
 * - Nested blocks are supported via the internal `jump` counter.
 * - If no terminating top-level `}` is found, the function collects all lines and the returned
 *   `code` will be an empty string.
 *
 * @param code - The full source text to scan (lines separated by '\n').
 *
 * @returns A {@link CodeSplit `CodeSplit`} object describing the split:
 *   - part: string[] — the collected lines that belong to the detected subprocess block (in original order),
 *   - code: string — the remainder of the source text after the consumed closing brace, joined with '\n'.
 */
function detectSubprocess(code: string): CodeSplit {
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

/**
 * Parse a role signature string and produce a `Role` descriptor.
 *
 * The input string is normalized (a single space is removed, "(" is replaced by a space, ")" is removed,
 * and multiple consecutive spaces are collapsed) and then split on the first remaining space to separate
 * the role label from an optional parameter substring. Fields, if present, are expected to be
 * semicolon-separated entries of the form "name:type".
 *
 * @param role - A role signature string. Examples:
 *   - "RoleName"
 *   - "RoleName(param:Type;other:Type)"
 *   - "Role Name(param: Type)" (whitespace will be normalized)
 *
 * @returns A `Role` object:
 *   - `role`: the extracted role label
 *   - `label`: the same value as `role`
 *   - `fields`: an array of {@link Field `Field`} objects; empty if no fields were provided.
 *
 * @remarks
 * - If a parameter entry does not contain a colon, its `type` will be `undefined`.
 * - Extra whitespace and surrounding parentheses are normalized/removed before parsing.
 * - If no parameters are provided, the `fields` array will be empty.
 *
 * @see {@link Role `Role`}
 */
function genRole(role: string): Role {
  const [roleLabel, roleFields] = role
    .replace(" ", "")
    .replace("(", " ")
    .replace(")", "")
    .replace(/\s{2,}/g, " ")
    .split(" ");

  const fields: Field[] = roleFields
    ? roleFields.split(";").map((field) => {
        const [varName, type] = field.split(":");
        return { var: varName, type };
      })
    : [];

  return {
    role: roleLabel,
    label: roleLabel,
    fields: fields,
  };
}

/**
 * Generate a graph representation (nodes and edges) from a textual specification.
 *
 * The function parses a domain-specific language that describes events, relations,
 * and nested subprocesses to produce arrays of `Node` and `Edge` objects suitable for
 * visualization or further processing.
 *
 * Parsing highlights:
 * - The top-level input is split by an {@link untilMatch `untilMatch`} helper that separates event
 *   declarations (`result.part`) from relation/subprocess code (`result.code`).
 * - Event syntax is matched against a global {@link eventRegex `eventRegex`}. For each matched event:
 *   - Whitespace inside captures is stripped.
 *   - `eventInfo` yields a label and an optional name (split by ":").
 *   - `ifc` is stored as a security/interface string.
 *   - `typeInfo` determines whether the event is an input (`?`) or a communication/expression:
 *     - Input (`?`) can be `Unit`, a primitive type, or a `Record` described as `{field:Type;...}`.
 *     - Non-inputs are treated as expressions and stored in `expression`.
 *   - `initRecv` describes initiators and optional receivers, split by "->" and bracketed `[]`.
 *   - Marking flags are inferred:
 *     - `included = true` unless the event string contains '%'
 *     - `pending = true` if the event string contains '!'
 *   - A new `Node` with type "event" is pushed with fields:
 *     - `id` (global `nodeId` counter prefix e...), `data` (all node metadata required), `parentId`/`expandParent`/`extent`, `position`, `zIndex`.
 *
 * - After events are parsed, the remaining lines are processed to create edges and subprocesses:
 *   - Lines ending with "{" denote the start of a subprocess whose trigger is the preceding token:
 *     - A subprocess node (type "subprocess") is created (id uses global `subId` counter, prefix s...).
 *     - An edge of type "spawn" connects the trigger event to the subprocess.
 *     - The subprocess body is extracted using {@link detectSubprocess `detectSubprocess`}, and {@link genGraph `genGraph`} is called recursively
 *       with the subprocess body and the subprocess id as `parentId`. Returned nodes/edges are merged,
 *       with the subprocess node prepended.
 *   - Other lines are considered relation lines.
 *     - Multiple sources/targets may be comma-separated.
 *     - The relation token is mapped through a global {@link relationsMap `relationsMap`} and validated with {@link isValidType `isValidType`}.
 *     - Edges are emitted for every (source, target) pair with id `${type.charAt(0)}-${source}-${target}`,
 *       `data.guard = ""`, and `zIndex`.
 *
 * Parent-child resolution:
 * - If `parentId` is provided, lookups for event labels first prefer nodes whose parentId equals the provided parentId.
 *   This allows correct scoping of triggers and relation endpoints inside subprocesses.
 *
 * Parameters:
 * @param code - The textual specification to parse. Expected to contain event declarations and relation/subprocess lines.
 * @param parentId - Optional id of a parent subprocess node; when provided, newly created nodes may be assigned this parent,
 *                   and label resolution preferentially searches nodes in this parent scope.
 * @param nds - Optional initial array of `Node` objects to which parsed nodes will be appended/merged. If omitted a new array is created.
 * @param eds - Optional initial array of `Edge` objects to which parsed edges will be appended/merged. If omitted a new array is created.
 *
 * @returns An object with:
 *   - nodes: `Node[]` — the list of generated (and possibly pre-existing) nodes, including event and subprocess nodes.
 *   - edges: `Edge[]` — the list of generated edges, including relation edges and spawn edges for subprocesses.
 *
 * Remarks / caveats:
 * - The exact `Node` and `Edge` shapes are assumed by callers; this function sets certain fields (`position`, `zIndex`, `width`/`height`
 *   for subprocesses, `data.*` fields described above). Consumers should be compatible with those conventions.
 * - Record field parsing for inputs splits fields on ';' and each field on ':'; malformed field entries may produce undefined types.
 * - The function performs fairly permissive string manipulations (replace/split) and will skip lines it cannot interpret.
 * - Because the function uses and increments external counters (`nodeId`/`subId`) it is stateful: repeated calls will produce
 *   different ids unless those counters are reset.
 *
 * @see {@link Node `Node`}
 * @see {@link Edge `Edge`}
 */
function genGraph(
  code: string,
  parentId?: string,
  nds?: Node[],
  eds?: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  let result = untilMatch(code, ";");

  let nodes: Node[] = nds ? nds : [];
  for (const ev of result.part) {
    const match = eventRegex.exec(ev);
    console.log("Matching event:", ev, match);

    if (match) {
      const eventInfo = match[1].replace(/\s/g, "") || "";
      const ifc = match[2].replace(/\s/g, "") || "";
      const typeInfo = match[3].replace(/\s/g, "") || "";
      const initRecv = match[4].replace(" -> ", "->") || "";

      const marking: Marking = {
        included: !ev.includes("%"),
        pending: ev.includes("!"),
      };
      const [label, name] = eventInfo
        .replace("!", "")
        .replace("%", "")
        .split(":");

      let type: string = "";
      let input: Input | undefined = undefined;
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

            const recordFields: Field[] = fields.map((field) => {
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
        id: `e${nodeId++}`,
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

        let type: string = relationsMap[tp]; // MIGHT NOT WORK

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

/**
 * Cleans a block of source code by removing specific control sequences, trimming each line,
 * and discarding empty lines and single-line comments.
 *
 * Behavior:
 * - Removes all occurrences of the sequence '\r\t' from the input.
 * - Splits the input into lines using '\n'.
 * - Trims leading and trailing whitespace from each line.
 * - Omits any line that is empty after trimming or that begins with '//' (single-line comment).
 * - Preserves the original order of the remaining lines and joins them with '\n'.
 *
 * @param code - The raw source code string to be cleaned.
 *
 * @returns A string containing the cleaned code: trimmed, non-empty, non-comment lines joined by newline characters.
 *
 * @remarks
 * - The function performs a literal replacement of the '\r\t' sequence; other carriage return or tab patterns are not altered.
 * - Inline comments (e.g., code followed by '// comment') and block comments (/* ... *\/) are not specially handled and remain.
 */
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

/**
 * Generate a `DCRGraph` from a textual specification.
 *
 * The function performs the following high-level steps:
 * 1. Cleans the input with {@link cleanCode `cleanCode`}.
 * 2. Extracts the first semicolon-delimited section and parses each entry into a `Role` using {@link genRole `genRole`}.
 * 3. Extracts the next semicolon-delimited section and treats it as the `security` string (joined with newlines).
 * 4. Resets the global counters `nodeId` and `subId` to 0.
 * 5. Generates the graph (`nodes` and `edges`) from the remainder of the code using `genGraph`.
 * 6. Returns the assembled `DCRGraph` object containing roles, security, nodes, edges and the current id counters.
 *
 * @param code - Raw textual DCR specification to be parsed. Expected format: roles; security; graph-spec...
 *
 * @returns A `DCRGraph` object:
 *  - roles: parsed array of `Role` objects (from the first section),
 *  - security: string representing the security section (from the second section),
 *  - nodes, edges: graph structure returned by `genGraph` (parsed from the remainder),
 *  - nodeId, subId: numeric id counters (reset to 0 before graph generation and returned afterwards).
 *
 * @see {@link DCRGraph `DCRGraph`}
 * @see {@link Role `Role`}
 * @see {@link genGraph `genGraph`}
 */
export function visualGen(code: string): DCRGraph {
  let result = untilMatch(cleanCode(code), ";");
  const roles: Role[] = result.part.map((role) => genRole(role));

  result = untilMatch(result.code, ";");
  const security = result.part.join("\n");

  nodeId = 0;
  subId = 0;
  const { nodes, edges } = genGraph(result.code);

  return { roles, security, nodes, edges, nodeId, subId };
}
