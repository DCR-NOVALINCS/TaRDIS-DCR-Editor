import { useState } from "react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { Workflow } from "lucide-react";
import { FieldType, simpleInputTypes } from "@/lib/types";

const selector = (state: RFState) => ({
  getChoreographyInfo: state.getChoreographyInfo,
  security: state.security,
  setSecurity: state.setSecurity,
  addRole: state.addRole,
  removeRole: state.removeRole,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  projectionInfo: state.projectionInfo,
  currentProjection: state.currentProjection,
  changeNodes: state.changeNodes,
});

/**
 * Renders the main menu for managing choreography metadata, roles, and security in the TaRDIS DCR Editor.
 *
 * This component provides:
 * - Display of current choreography information (number of events, roles).
 * - Editing of global documentation and security properties.
 * - Management of roles, including adding and removing roles with parameters.
 * - (Commented out) Management of participants associated with roles.
 *
 * Uses state from a global store via `useStore` and provides a UI for interacting with choreography data.
 *
 * @component
 * @returns {JSX.Element} The rendered choreography menu UI.
 */
export default function ChoreographyMenu() {
  const {
    getChoreographyInfo,
    security,
    setSecurity,
    addRole,
    removeRole,
    documentation,
    addDocumentation,
    projectionInfo,
    currentProjection,
    changeNodes,
  } = useStore(selector, shallow);

  const { nodesCount, roles } = getChoreographyInfo();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  /**
   * RoleMenu is a React functional component that provides a user interface for managing roles within a choreography editor.
   *
   * Features:
   * - Allows users to add a new role by specifying a role name, label, and a list of parameter types.
   * - Supports dynamic addition and removal of parameter types for each role.
   * - Provides validation feedback for required fields (role name and label).
   * - Enables users to remove existing roles from a dropdown selection.
   *
   * State Management:
   * - Manages local state for the role name, label, parameter types, and the currently selected role for removal.
   *
   * Props/Dependencies:
   * - Expects `roles` (array of role names), `addRole` (function to add a role), `removeRole` (function to remove a role),
   *   `setRoleMenuOpen` (function to control menu visibility), and `simpleInputTypes` (array of available parameter types) to be available in the parent scope.
   *
   * UI:
   * - Divided into sections for adding and removing roles, with clear labels and interactive controls.
   *
   * @component
   * @returns {JSX.Element} - The renderent role menu component.
   */
  const RoleMenu = () => {
    const [roleAdd, setRoleAdd] = useState("");
    const [roleAbbrv, setRoleAbbrv] = useState("");
    const [roleTypes, setRoleTypes] = useState<FieldType[]>([]);
    const [roleTypesInput, setRoleTypesInput] = useState<FieldType>({
      var: "",
      type: simpleInputTypes[0],
    });
    const [roleRemove, setRoleRemove] = useState(roles[0].role);

    return (
      <>
        <div className="grid grid-cols-3 gap-2 p-3 border-t-2 border-[#CCCCCC] items-center h-full select-none">
          <label className="py-1 col-span-3 flex justify-center font-bold">
            Adding a Role
          </label>
          <label>Role</label>
          <input
            className={`col-span-2 h-8 bg-white ${
              roleAdd ? "" : "border-red-500 border-1"
            } rounded-sm px-1 font-mono`}
            placeholder="Role name"
            onChange={(event) => {
              const roleName = event.target.value;
              setRoleAdd(roleName);
              setRoleAbbrv(roleName.charAt(0).toUpperCase());
            }}
          />
          <label>Label</label>
          <input
            className={`col-span-2 h-8 bg-white ${
              roleAbbrv ? "" : "border-red-500 border-1"
            }  rounded-sm px-1 font-mono`}
            value={roleAbbrv}
            placeholder="Label"
            onChange={(event) => {
              setRoleAbbrv(event.target.value);
            }}
          />
          <label className="py-1 col-span-3 flex justify-center font-bold text-sm">
            Parameters
          </label>
          <label>Label</label>
          <input
            className={`col-span-2 h-8 bg-white rounded-sm px-1 font-mono`}
            value={roleTypesInput.var}
            placeholder="Parameter name"
            onChange={(event) =>
              setRoleTypesInput((prev) => ({
                ...prev,
                var: event.target.value,
              }))
            }
          />
          <label>Type</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            value={roleTypesInput.type}
            onChange={(event) =>
              setRoleTypesInput((prev) => ({
                ...prev,
                type: event.target.value,
              }))
            }
          >
            {simpleInputTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (roleTypesInput.var) {
                setRoleTypes((prev) => [...prev, roleTypesInput]);
                setRoleTypesInput({ var: "", type: simpleInputTypes[0] });
              }
            }}
            className="bg-black col-span-3 h-8 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Add Parameter
          </button>
          {roleTypes.map((type, index) => (
            <div
              key={index}
              className="col-span-3 flex justify-between items-center"
            >
              <label className="font-mono">
                {type.var}: {type.type}
              </label>
              <button
                onClick={() =>
                  setRoleTypes((prev) => prev.filter((_, i) => i !== index))
                }
                className="bg-red-500 h-8 w-8 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end p-3 border-b-2 border-[#CCCCCC]">
          <button
            onClick={() => {
              if (roleAdd && roleAbbrv) {
                addRole({
                  role: roleAdd,
                  label: roleAbbrv,
                  types: roleTypes ?? [],
                });
                setRoleAdd("");
                setRoleAbbrv("");
                setRoleTypes([]);
              }
            }}
            className="bg-black h-8 w-1/3 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Add Role
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3 border-[#CCCCCC] items-center h-full select-none">
          <label className="py-1 col-span-3 flex justify-center font-bold">
            Removing a Role
          </label>
          <label>Role</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            onChange={(event) => setRoleRemove(event.target.value)}
          >
            {roles.map((role, index) => (
              <option key={index} value={role.role}>
                {role.role}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-end p-3">
          <button
            onClick={() => {
              removeRole(roleRemove);
              setRoleMenuOpen(false);
              setRoleRemove("");
            }}
            className="bg-black h-8 w-1/3 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Remove
          </button>
        </div>
      </>
    );
  };

  {
    /*
  const ParticipantMenu = () => {
    const [roleAdd, setRoleAdd] = useState(roles[0]);
    const [roleTypes, setRoleTypes] = useState(() => {
      const role = rolesParticipants.find((rl) => rl.role === roleAdd);
      if (role) {
        const defaultId = role.participants.length + 1;
        return role.types.map((type) => ({
          var: type.var,
          type: type.type,
          input: type.type === "Boolean" ? "true" : defaultId.toString(),
        }));
      }
      return [{ var: "", type: "", input: "" }];
    });

    const [roleRemove, setRoleRemove] = useState(roles[0]);
    const [participant, setParticipant] = useState(
      rolesParticipants.find((rl) => rl.role === roleRemove)
        ?.participants?.[0] ?? ""
    );
    return (
      <>
        <div className="grid grid-cols-3 gap-2 p-3 border-t-2 border-[#CCCCCC]">
          <label className="py-1 col-span-3 flex justify-center font-bold">
            Adding a Participant
          </label>
          <label>Role</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            onChange={(event) => {
              setRoleAdd(event.target.value);
              setRoleTypes(() => {
                const role = rolesParticipants.find(
                  (rl) => rl.role === event.target.value
                );
                if (role) {
                  const defaultId = role.participants.length + 1;
                  return role.types.map((type) => ({
                    var: type.var,
                    type: type.type,
                    input:
                      type.type === "Boolean"
                        ? "true"
                        : type.var.toLowerCase() === "id"
                        ? defaultId.toString()
                        : "",
                  }));
                }
                return [{ var: "", type: "", input: "" }];
              });
            }}
          >
            {rolesParticipants
              .filter((role) => role.types.length > 0)
              .map((role, index) => (
                <option key={index} value={role.role}>
                  {role.role}
                </option>
              ))}
          </select>
          {roleTypes.map((type) => (
            <>
              <label className="font-mono">{type.var}</label>
              {type.type === "Boolean" ? (
                <select
                  className="col-span-2 h-8 bg-white rounded-sm font-mono"
                  value={type.input}
                  onChange={(event) => {
                    const newRoleTypes = roleTypes?.map((roleType) => {
                      if (roleType.var === type.var) {
                        return { ...roleType, input: event.target.value };
                      }
                      return roleType;
                    });
                    if (
                      newRoleTypes.filter((rlType) => rlType.input).length ===
                      newRoleTypes.length
                    ) {
                      setRoleTypes(newRoleTypes);
                    }
                  }}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  className={`col-span-2 h-8 bg-white rounded-sm px-1 ${
                    type.input ? "" : "border-red-500 border-1 font-mono"
                  }`}
                  placeholder={type.type}
                  value={type.input}
                  type={type.type === "Integer" ? "number" : "text"}
                  onChange={(event) => {
                    const newRoleTypes = roleTypes?.map((roleType) => {
                      if (roleType.var === type.var) {
                        return { ...roleType, input: event.target.value };
                      }
                      return roleType;
                    });
                    setRoleTypes(newRoleTypes);
                  }}
                />
              )}
            </>
          ))}
        </div>

        <div className="flex flex-col items-end border-b-2 p-3 border-[#CCCCCC]">
          <button
            onClick={() => {
              if (
                roleTypes.length ===
                roleTypes.filter((rlType) => rlType.input).length
              ) {
                addParticipant({ role: roleAdd, inputs: roleTypes ?? [] });
                setParticipantMenuOpen(false);
                setRoleAdd(roles[0]);
              }
            }}
            className="bg-black h-8 w-1/3 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Add
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 border-[#CCCCCC]">
          <label className="py-1 col-span-3 flex justify-center font-bold">
            Removing a Participant
          </label>
          <label>Role</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            onChange={(event) => {
              setRoleRemove(event.target.value);
              setParticipant(
                rolesParticipants.find((rl) => rl.role === event.target.value)
                  ?.participants[0] ?? ""
              );
            }}
          >
            {rolesParticipants
              .filter((role) => role.types.length > 0)
              .map((role, index) => (
                <option key={index} value={role.role}>
                  {role.role}
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3 py-1 border-[#CCCCCC]">
          <label>Participant</label>
          <select
            className="col-span-2 h-8 bg-white rounded-sm font-mono"
            onChange={(event) => {
              setParticipant(event.target.value);
            }}
          >
            {rolesParticipants
              .find((rl) => rl.role === roleRemove)
              ?.participants.map((participant, index) => (
                <option key={index} value={participant}>
                  {participant}
                </option>
              ))}
          </select>
        </div>
        <div className="flex flex-col items-end p-3">
          <button
            onClick={() => {
              removeParticipant(roleRemove, participant);
              setRoleMenuOpen(false);
              setRoleRemove("");
              setParticipant("");
            }}
            className="bg-black h-8 w-1/3 rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Remove
          </button>
        </div>
      </>
    );
  };
  */
  }

  const rolesFiltered = roles.filter(
    (role) => role.label !== currentProjection
  );
  return (
    <div className="flex flex-col mr-4 w-[calc(100%-6px)] h-[95vh]">
      {/* CURRENT CHOREOGRAPHY */}
      <div className="flex select-none items-center gap-5 p-4 border-b-2 border-[#CCCCCC]">
        <Workflow size={40} />
        Choreography
      </div>

      {/* DOCUMENTATION OF CHOREOGRAPHY */}
      <div className="flex flex-col p-3 gap-2 border-b-2 border-[#CCCCCC] ">
        <div className="font-bold text-[16px] select-none">Documentation</div>
        <textarea
          className="bg-white rounded-sm min-h-16 max-h-64 p-1 h-16 text-[14px]"
          value={documentation.get("global")}
          onChange={(event) => addDocumentation("global", event.target.value)}
        />
      </div>

      {/* CHOREOGRAPHY INFO */}
      {currentProjection ? (
        <div className="flex flex-col gap-3 overflow-y-auto h-full">
          <div className="p-3 flex flex-col gap-3 select-none">
            <p>Currently representing the {currentProjection} projection.</p>
            <p>
              There{" "}
              {rolesFiltered.length === 1
                ? "is only 1 more role"
                : "are " + rolesFiltered.length + " more roles"}{" "}
              in the system:
              {rolesFiltered.map((role, index) => {
                const projection = projectionInfo.get(role.label);

                return projection ? (
                  <li
                    key={index}
                    className="font-bold italic cursor-pointer select-none hover:underline hover:opacity-75"
                    onClick={() => changeNodes(currentProjection, role.label)}
                  >
                    {role.role}
                  </li>
                ) : (
                  <li key={index} className="font-bold italic">
                    {role.role}
                  </li>
                );
              })}
            </p>
            <p
              className="font-bold cursor-pointer hover:underline select-none hover:opacity-75"
              onClick={() => changeNodes(currentProjection)}
            >
              See global projection.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto h-full">
          <div className="p-3 flex flex-col gap-3 select-none">
            <p>Currently, the system has {nodesCount} events.</p>
            <p>
              There{" "}
              {roles.length === 1
                ? "is only " + roles.length + " role"
                : "are " + roles.length + " roles"}{" "}
              in the system:
              {roles.map((role, index) => {
                const projection = projectionInfo.get(role.label);

                return projection ? (
                  <li
                    key={index}
                    className="font-bold italic cursor-pointer hover:underline hover:opacity-75 select-none"
                    draggable={false}
                    onClick={() =>
                      changeNodes(
                        currentProjection ? currentProjection : "global",
                        role.label
                      )
                    }
                  >
                    {role.role}
                  </li>
                ) : (
                  <li key={index} className="font-bold italic select-none">
                    {role.role}
                  </li>
                );
              })}
            </p>
            <div className="flex flex-col items-center gap-2">
              <label className="font-bold select-none">Security</label>
              <textarea
                className="bg-white rounded-sm min-h-24 max-h-64 px-1 w-full font-mono"
                value={security}
                onChange={(event) => {
                  setSecurity(event.target.value);
                }}
              />
            </div>

            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
              >
                Roles
              </button>
            </div>
            {/*
          <button
            onClick={() => {
              setParticipantMenuOpen(!participantMenuOpen);
              setRoleMenuOpen(false);
            }}
            className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          >
            Participants
          </button>
          */}
          </div>
          {/* ROLE MENU */}
          {roleMenuOpen && <RoleMenu />}
        </div>
      )}

      {/* PARTICIPANT MENU 
      {participantMenuOpen && <ParticipantMenu />}
      */}
    </div>
  );
}
