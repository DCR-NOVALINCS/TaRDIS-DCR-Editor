import { useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { Workflow } from "lucide-react";
import { FieldType, ProjectionInfo, simpleInputTypes } from "@/lib/types";
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
});

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

const RoleMenu = ({
  roles,
  addRole,
  removeRole,
}: {
  roles: { role: string; label: string }[];
  addRole: (role: { role: string; label: string; types: FieldType[] }) => void;
  removeRole: (roleName: string) => void;
}) => {
  const [roleData, setRoleData] = useState<{
    name: string;
    label: string;
    parameters: FieldType[];
  }>({
    name: "",
    label: "",
    parameters: [],
  });

  const roleOptions = [{ role: "-", label: "-" }, ...roles];

  const [selectedRoleForRemoval, setSelectedRoleForRemoval] = useState(
    roleOptions[0].role
  );

  const updateRoleName = (name: string) => {
    setRoleData((prev) => ({
      ...prev,
      name,
      label: name.charAt(0).toUpperCase(),
    }));
  };

  const handleAddRole = () => {
    if (roleData.name && roleData.label) {
      addRole({
        role: roleData.name,
        label: roleData.label,
        types: roleData.parameters,
      });
      setRoleData({ name: "", label: "", parameters: [] });
    }
  };

  const handleRemoveRole = () => {
    if (selectedRoleForRemoval !== "-") {
      removeRole(selectedRoleForRemoval);
      setSelectedRoleForRemoval("-");
    }
  };

  const addParameter = (param: FieldType) => {
    setRoleData((prev) => ({
      ...prev,
      parameters: [...prev.parameters, param],
    }));
  };

  const removeParameter = (index: number) => {
    setRoleData((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
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
          value={roleData.name}
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
          parameters={roleData.parameters}
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

const RoleList = ({
  roles,
  nodesCount,
  projectionInfo,
  currentProjection,
  onRoleClick,
  seeGlobalClick = () => {},
}: {
  roles: { role: string; label: string }[];
  nodesCount: number;
  projectionInfo: Map<string, ProjectionInfo>;
  currentProjection?: string;
  onRoleClick: (roleLabel: string) => void;
  seeGlobalClick?: () => void;
}) => {
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
      <p>
        There {getRoleCountText(roles.length)} in the system:
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
              onClick={isClickable ? () => onRoleClick(role.label) : undefined}
              draggable={false}
            >
              {role.role}
            </li>
          );
        })}
      </p>
      {currentProjection !== "global" && (
        <p
          className="font-bold cursor-pointer hover:underline select-none hover:opacity-75"
          onClick={seeGlobalClick}
        >
          See global projection.
        </p>
      )}
    </>
  );
};

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

  const rolesFiltered = roles.filter(
    (role) => role.label !== currentProjection
  );

  const key = "global";

  const handleRoleClick = (roleLabel: string) => {
    const sourceProjection = currentProjection || key;
    changeNodes(sourceProjection, roleLabel);
  };

  const handleGlobalProjectionClick = () => {
    changeNodes(currentProjection, key);
  };

  return (
    <DrawerMenu>
      <DrawerMenuLabel>
        <Workflow size={40} />
        Choreography
      </DrawerMenuLabel>

      {/* Documentation */}
      <FormDocumentation
        documentation={documentation.get(key)}
        onChange={(e) => addDocumentation(key, e.target.value)}
        key={key}
      />

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
                  <label className="font-bold select-none">Security</label>
                  <textarea
                    className="bg-white rounded-sm min-h-24 max-h-64 px-1 w-full font-mono"
                    value={security}
                    onChange={(e) => setSecurity(e.target.value)}
                    placeholder="Security Lattice"
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
