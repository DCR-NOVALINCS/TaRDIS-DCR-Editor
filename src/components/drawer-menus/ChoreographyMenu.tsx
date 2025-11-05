import { useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { Workflow } from "lucide-react";
import {
  FieldType,
  ProjectionInfo,
  RoleAdd,
  simpleInputTypes,
  SimplerRole,
} from "@/lib/types";
import {
  Button,
  DrawerMenu,
  DrawerMenuLabel,
  FormDocumentation,
  FormInput,
} from "@/lib/reusable-comps";

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
  setCode: state.setCode,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  setCurrentProjection: state.setCurrentProjection,
  setIds: state.setIds,
  setRoles: state.setRoles,
  setSelectedElement: state.setSelectedElement,
  clearProjections: state.clearProjections,
});

/**
 * Renders and manages a small form that allows adding and removing parameters for a role.
 *
 * @param parameters - array of existing {@link FieldType `FieldType`} parameter objects to display.
 * @param onAdd - callback invoked with a {@link FieldType `FieldType`} when the user adds a new parameter.
 * @param onRemove - callback invoked with the index of the parameter to remove.
 *
 * @see {@link simpleInputTypes `simpleInputTypes`} for the list of allowed parameter types.
 *
 * @component
 * @returns JSX element representing the parameter management UI.
 *
 * Behavior / Notes:
 * - Maintains an internal controlled input state (`paramInput`) with shape `{ var: string; type: string }`.
 * - Validates that the parameter `var` (name) is non-empty before calling `onAdd`.
 * - Resets the internal input state to an empty name and the first available type after adding.
 * - Renders a select for `type` using `simpleInputTypes` and a list of current parameters with remove buttons.
 */
const ParameterManager = ({
  parameters,
  onAdd,
  onRemove,
}: {
  parameters: FieldType[];
  onAdd: (param: FieldType) => void;
  onRemove: (index: number) => void;
}) => {
  const [paramInput, setParamInput] = useState({
    var: "",
    type: simpleInputTypes[0],
  });

  /**
   * Handles the addition of a new parameter by validating input and invoking the {@link onAdd `onAdd`} callback.
   */
  const handleAddParameter = () => {
    if (paramInput.var) {
      onAdd(paramInput);
      setParamInput({ var: "", type: simpleInputTypes[0] });
    }
  };

  return (
    <>
      <label className="py-1 col-span-3 flex justify-center font-bold text-sm">
        Parameters
      </label>

      <FormInput
        label="Label"
        value={paramInput.var}
        placeholder="Parameter name"
        onChange={(e) =>
          setParamInput((prev) => ({ ...prev, var: e.target.value }))
        }
      />

      <label>Type</label>
      <select
        className="col-span-2 h-8 bg-white rounded-sm font-mono"
        value={paramInput.type}
        onChange={(e) =>
          setParamInput((prev) => ({ ...prev, type: e.target.value }))
        }
      >
        {simpleInputTypes.map((type, index) => (
          <option key={index} value={type}>
            {type}
          </option>
        ))}
      </select>

      <Button onClick={handleAddParameter} className="col-span-3">
        Add Parameter
      </Button>

      {parameters.map((param, index) => (
        <div
          key={index}
          className="col-span-3 flex justify-between items-center"
        >
          <label className="font-mono">
            {param.var}: {param.type}
          </label>
          <Button variant="danger" onClick={() => onRemove(index)}>
            X
          </Button>
        </div>
      ))}
    </>
  );
};

/**
 * UI for adding and removing roles. Supports specifying a role name, its label and arbitrary typed parameters.
 *
 * @param roles - current roles in the system (used to build the "remove" dropdown and to present a "-" option).
 * @param addRole - callback invoked to add a role. Receives an object of type {@link RoleAdd `RoleAdd`}.
 * @param removeRole - callback invoked to remove a role by its role name.
 *
 * @see {@link SimplerRole `SimplerRole`} for the role type used in the `roles` parameter.
 *
 * @component
 * @returns JSX element representing the role management menu.
 *
 * Behavior / Notes:
 * - Uses internal state `roleData` of type {@link RoleAdd `RoleAdd`} to accumulate the input for a new role.
 * - `updateRoleName` auto-upcases the first character for the `label` when the role `name` is changed.
 * - `handleAddRole` validates that both `name` and `label` exist and then calls `addRole`, resetting local state.
 * - `handleRemoveRole` removes the role selected from a dropdown; the dropdown includes a sentinel "-" option.
 * - Parameter editing for a role uses the {@link ParameterManager `ParameterManager`} component. Parameters are held locally until `Add Role` button is pressed.
 */
const RoleMenu = ({
  roles,
  addRole,
  removeRole,
}: {
  roles: SimplerRole[];
  addRole: (role: RoleAdd) => void;
  removeRole: (roleName: string) => void;
}) => {
  const [roleData, setRoleData] = useState<RoleAdd>({
    role: "",
    label: "",
    types: [],
  });

  const roleOptions = [{ role: "-", label: "-" }, ...roles];

  const [selectedRoleForRemoval, setSelectedRoleForRemoval] = useState(
    roleOptions[0].role
  );

  /**
   * Updates the role name in local state and auto-upcases the first character for the label.
   *
   * @param role - name of the role to set.
   */
  const updateRoleName = (role: string) => {
    setRoleData((prev) => ({
      ...prev,
      role,
      label: role.charAt(0).toUpperCase(),
    }));
  };

  /**
   * Handles adding a new role by validating input and invoking the {@link addRole `addRole`} callback.
   */
  const handleAddRole = () => {
    if (roleData.role && roleData.label) {
      addRole({
        role: roleData.role,
        label: roleData.label,
        types: roleData.types,
      });
      setRoleData({ role: "", label: "", types: [] });
    }
  };

  /**
   * Handles removing a role by invoking the {@link removeRole `removeRole`} callback with the selected role name.
   */
  const handleRemoveRole = () => {
    if (selectedRoleForRemoval !== "-") {
      removeRole(selectedRoleForRemoval);
      setSelectedRoleForRemoval("-");
    }
  };

  /**
   * Adds a new parameter to the local role data.
   *
   * @param type - the {@link FieldType `FieldType`} parameter to add.
   */
  const addParameter = (type: FieldType) => {
    setRoleData((prev) => ({
      ...prev,
      types: [...prev.types, type],
    }));
  };

  /**
   * Removes a parameter from the local role data by its index.
   *
   * @param index - index of the parameter to remove.
   */
  const removeParameter = (index: number) => {
    setRoleData((prev) => ({
      ...prev,
      types: prev.types.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      {/* Add Role Section */}
      <div className="grid grid-cols-3 gap-2 p-3 border-t-2 border-[#CCCCCC] items-center h-full select-none">
        <label className="py-1 col-span-3 flex justify-center font-bold">
          Adding a Role
        </label>

        <FormInput
          label="Role"
          value={roleData.role}
          placeholder="Role name"
          required
          onChange={(e) => updateRoleName(e.target.value)}
        />

        <FormInput
          label="Label"
          value={roleData.label}
          placeholder="Label"
          required
          onChange={(e) =>
            setRoleData((prev) => ({ ...prev, label: e.target.value }))
          }
        />

        <ParameterManager
          parameters={roleData.types}
          onAdd={addParameter}
          onRemove={removeParameter}
        />
      </div>

      <div className="flex flex-col items-end p-3 border-b-2 border-[#CCCCCC]">
        <Button onClick={handleAddRole} className="w-1/3">
          Add Role
        </Button>
      </div>

      {/* Remove Role Section */}
      <div className="grid grid-cols-3 gap-2 px-3 border-[#CCCCCC] items-center h-full select-none">
        <label className="py-1 col-span-3 flex justify-center font-bold">
          Removing a Role
        </label>

        <label>Role</label>
        <select
          className="col-span-2 h-8 bg-white rounded-sm font-mono"
          value={selectedRoleForRemoval}
          onChange={(e) => setSelectedRoleForRemoval(e.target.value)}
        >
          {roleOptions.map((role, index) => (
            <option key={index} value={role.role}>
              {role.role}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col items-end p-3">
        <Button onClick={handleRemoveRole} className="w-1/3">
          Remove
        </Button>
      </div>
    </>
  );
};

/**
 * Displays a short summary of the choreography's roles and exposes clicks to navigate to role-specific projections.
 *
 * @param roles - array of roles of type {@link SimplerRole `SimplerRole`} to display.
 * @param nodesCount - number of nodes/events in the global choreography (used in summary text).
 * @param projectionInfo - map from role label to {@link ProjectionInfo `ProjectionInfo`}; presence of an entry indicates the role has its own projection.
 * @param currentProjection - Optional currently displayed projection id (e.g. "global" or a role label).
 * @param onRoleClick - Callback invoked with a role label when a clickable role is selected.
 * @param seeGlobalClick - Optional callback triggered when the `See Global Choreography` button is shown and clicked.
 *
 * @component
 * @returns a short descriptive summary and a list of role names in JSX element format. Roles which have an entry in {@link projectionInfo `projectionInfo`} are rendered as clickable
 * (hover/underline) and trigger {@link onRoleClick `onRoleClick`} when selected.
 *
 * Behavior / Notes:
 * - When `currentProjection !== "global"`, the component shows a "See Global Projection" button.
 * - Default for `seeGlobalClick = () => {}` is used so callers can omit the prop without extra conditional checks.
 *   This no-op default ensures clicking the button (if shown) is safe even when no handler is supplied.
 */
const RoleList = ({
  roles,
  nodesCount,
  projectionInfo,
  currentProjection,
  onRoleClick,
  seeGlobalClick = () => {},
}: {
  roles: SimplerRole[];
  nodesCount: number;
  projectionInfo: Map<string, ProjectionInfo>;
  currentProjection?: string;
  onRoleClick: (roleLabel: string) => void;
  seeGlobalClick?: () => void;
}) => {
  /**
   * Returns a short human-readable sentence describing the number of roles.
   *
   * Note: This function reads {@link currentProjection `currentProjection`} from the surrounding scope.
   *
   * @param count - the number of roles to describe.
   * @returns a localized sentence describing the role count and projection context.
   */
  const getRoleCountText = (count: number) => {
    const more = currentProjection !== "global" ? "more" : "";
    return count === 1
      ? `is only 1 ${more} role`
      : `are ${count} ${more} roles`;
  };

  return (
    <>
      {currentProjection !== "global" ? (
        <p>Currently representing the {currentProjection} projection.</p>
      ) : (
        <p>Currently, the system has {nodesCount} events.</p>
      )}
      <div className="flex flex-col gap-2">
        There {getRoleCountText(roles.length)} in the system:
        <p className="px-5">
          {roles.map((role, index) => {
            const projection = projectionInfo.get(role.label);
            const isClickable = !!projection;

            return (
              <li
                key={index}
                className={`font-bold italic select-none ${
                  isClickable
                    ? "cursor-pointer hover:underline hover:opacity-75"
                    : ""
                }`}
                onClick={
                  isClickable ? () => onRoleClick(role.label) : undefined
                }
                draggable={false}
              >
                {role.role}
              </li>
            );
          })}
        </p>
      </div>
      {currentProjection !== "global" && (
        <Button variant="primary" onClick={seeGlobalClick} className="w-full">
          See Global Choreography
        </Button>
      )}
    </>
  );
};

/**
 * Top-level menu component for managing choreography metadata, documentation, security lattice and roles in the TaRDIS DCR Editor.
 *
 * Renders:
 * - {@link DrawerMenu `DrawerMenu`} container with a label and workflow icon.
 * - Global documentation editor when the current projection is "global".
 * - {@link RoleList `RoleList`} showing roles and projection navigation.
 * - When in the global projection:
 *   - A security lattice textarea bound to the store's {@link security `security`} value.
 *   - Buttons to open the {@link RoleMenu `RoleMenu`} and to reset choreography information.
 * - {@link RoleMenu `RoleMenu`} (add/remove roles) when the role menu toggle is open.
 *
 * Store interactions / side effects:
 * - Reads and mutates application state via the `useStore(selector, shallow)` hook. Selected store actions and values:
 *   - {@link getChoreographyInfo `getChoreographyInfo`} to derive nodesCount and roles.
 *   - {@link security `security`} and {@link setSecurity `setSecurity`} to edit the security lattice.
 *   - {@link addRole `addRole`} / {@link removeRole `removeRole`} to manage roles.
 *   - {@link documentation `documentation`} / {@link addDocumentation `addDocumentation`} to edit global documentation.
 *   - {@link projectionInfo `projectionInfo`} / {@link currentProjection `currentProjection`} to navigate and present role projections.
 *   - {@link changeNodes} to switch the displayed projection by supplying a source projection and a role label.
 *   - {@link setCurrentProjection `setCurrentProjection`}, {@link setIds `setIds`}, {@link setRoles `setRoles`}, {@link setSelectedElement `setSelectedElement`}, {@link setNodes `setNodes`}, {@link setEdges `setEdges`}, {@link setCode `setCode`}, {@link clearProjections `clearProjections`}, {@link setSecurity `setSecurity`}
 *     are used by {@link resetInfo `resetInfo`} to return the editor to an initial/global empty state. Concretely, {@link resetInfo `resetInfo`}:
 *     - sets projection to `"global"`,
 *     - resets next id counters (`nextNodeId`, `nextGroupId`, `nextSubprocessId`) to `[0]`,
 *     - clears roles, selected element, nodes, edges and code,
 *     - clears the security string and clears projections via {@link clearProjections `clearProjections(true)`}.
 *
 * Usage:
 * - This component is the primary entry point for users to inspect choreography-wide information and to perform administrative actions
 *   (edit documentation, security lattice, add/remove roles, reset the editor).
 *
 * @component
 * @returns JSX element representing the choreography drawer menu.
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
    setCode,
    setNodes,
    setEdges,
    setCurrentProjection,
    setIds,
    setRoles,
    setSelectedElement,
    clearProjections,
  } = useStore(selector, shallow);

  const { nodesCount, roles } = getChoreographyInfo();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const rolesFiltered = roles.filter(
    (role) => role.label !== currentProjection
  );

  const key = "global";

  /**
   * Handles a click on a role name by changing the displayed projection to that role's projection.
   *
   * @see {@link changeNodes `changeNodes`} for the projection switching logic.
   *
   * @param roleLabel - role label corresponding to the projection to switch to.
   */
  const handleRoleClick = (roleLabel: string) => {
    const sourceProjection = currentProjection || key;
    changeNodes(sourceProjection, roleLabel);
  };

  /**
   * Handles clicking the `See Global Choreography` button by switching to the global projection.
   *
   * @see {@link changeNodes `changeNodes`} for the projection switching logic.
   */
  const handleGlobalProjectionClick = () => {
    changeNodes(currentProjection, key);
  };

  /**
   * Resets the choreography information in the editor to an initial/global empty state.
   */
  const resetInfo = () => {
    setCurrentProjection("global");
    setIds({ nextNodeId: [0], nextGroupId: [0], nextSubprocessId: [0] });
    setRoles([]);
    setSelectedElement(undefined);
    setNodes([]);
    setEdges([]);
    setCode("");
    setSecurity("");
    clearProjections(true);
  };

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <Workflow size={40} />
        Choreography
      </DrawerMenuLabel>

      {/* Documentation */}
      {currentProjection === "global" && (
        <FormDocumentation
          documentation={documentation.get(key)}
          onChange={(e) => addDocumentation(key, e.target.value)}
          key={key}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col gap-3 overflow-y-auto h-full">
        <div className="p-3 flex flex-col gap-3 select-none">
          <>
            <RoleList
              nodesCount={nodesCount}
              onRoleClick={handleRoleClick}
              projectionInfo={projectionInfo}
              roles={currentProjection === "global" ? roles : rolesFiltered}
              currentProjection={currentProjection}
              seeGlobalClick={handleGlobalProjectionClick}
            />
            {/* Security Section */}
            {currentProjection === "global" && (
              <>
                <div className="flex flex-col items-center gap-2">
                  <label className="font-bold select-none">
                    Security Lattice
                  </label>
                  <textarea
                    className="bg-white rounded-sm min-h-24 max-h-64 px-1 w-full font-mono"
                    value={security}
                    onChange={(e) => setSecurity(e.target.value)}
                    placeholder="Set security lattice..."
                  />
                </div>

                {/* Role Management Button */}
                <div className="flex gap-2 justify-end w-full">
                  <Button
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="w-full"
                  >
                    Roles
                  </Button>
                  <Button
                    variant="primary"
                    onClick={resetInfo}
                    className="w-full"
                  >
                    Reset Info
                  </Button>
                </div>
              </>
            )}
          </>
        </div>

        {/* Role Menu */}
        {roleMenuOpen && (
          <RoleMenu
            key={"global"}
            roles={roles}
            addRole={addRole}
            removeRole={removeRole}
          />
        )}
      </div>
    </DrawerMenu>
  );
}
