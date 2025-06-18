import { Parameter, Role } from "@/stores/roles-state";
import { splitArray } from "./utils";
import { Edge, Node } from "@xyflow/react";
import { FieldType, InputType, MarkingType } from "./codegen";

export function visualGen(code: string) {
  const [rls, sec, evs, rels] = splitArray(
    code.replace(/[\r\t]/g, "").split("\n"),
    ";"
  );

  const roles: Role[] = rls.map((rl) => {
    const [roleLabel, roleParams] = rl
      .replace(" ", "")
      .replace("(", " ")
      .replace(")", "")
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
      participants: [],
    };
  });

  const security = sec.join("\n");

  const events: Node[] = evs.map((ev, i) => {
    const [eventInfo, ifc, typeInfo, initRecv] = ev
      .replace("; ", ";")
      .replace(" -> ", "->")
      .split(" ");

    const marking: MarkingType = {
      included: !eventInfo.includes("%"),
      pending: eventInfo.includes("!"),
    };
    const [label, name] = eventInfo
      .replace("(", "")
      .replace(")", "")
      .split(":");

    const securityInfo = ifc.replace("(", "").replace(")", "");

    const cleanType = typeInfo.replace("[", "").replace("]", "");

    let type: string = "";
    let input: InputType | undefined = undefined;
    let expression: string = "";

    if (cleanType.charAt(0) === "?") {
      type = "i";
      const inputStr = cleanType.slice(2);

      if (inputStr) {
        if (inputStr.charAt(0) === "{") {
          const fields = inputStr.replace("{", "").replace("}", "").split(";");

          const recordFields: FieldType[] = fields.map((field) => {
            const [varName, fieldType] = field.split(":");
            return { var: varName, type: fieldType };
          });
          input = { type: "Record", record: recordFields };
        } else input = { type: inputStr };
      } else input = { type: "Unit" };
    } else {
      type = "c";
      expression = cleanType;
    }

    const [initiators, receivers] = initRecv
      .replace("[", "")
      .replace("]", "")
      .split("->");

    return {
      id: `e${i}`,
      type: "event",
      data: {
        initiators: initiators.split(", "),
        ...(receivers && { receivers: receivers.split(", ") }),
        type,
        label,
        name,
        marking,
        ...(input && { input }),
        ...(expression && { expression }),
        security: securityInfo,
      },
      parentId: "",
      position: { x: 0, y: 0 },
      zIndex: 10000,
    };
  });

  const relations: Edge[] = rels.map((rel) => {
    const [src, tp, tgt] = rel.split(" ");

    const source = (events.find((ev) => ev.data.label === src) as Node).id;
    const target = (events.find((ev) => ev.data.label === tgt) as Node).id;

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
      case "--<>":
        type = "milestone";
        break;
    }

    return {
      id: `${type.charAt(0)}-${source}-${target}`,
      type,
      source,
      target,
      data: {
        guard: "",
      },
      zIndex: 20000,
    };
  });

  console.log(events, relations);
}
