import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import { Setter, state } from "@/lib/types";
import { Role } from "@/lib/gens/data-types/codegen-types";

const fixRole = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Represents the state and operations related to roles and participants within the application.
 *
 * @property {Role[]} rolesParticipants - A list of roles, each containing associated participants.
 *
 * @method addRole - Adds a new role to the state.
 * @param {SimpleRole} role - The role to add.
 * @returns {void}
 *
 * @method removeRole - Removes a role from the state.
 * @param {string} role - The name or ID of the role to remove.
 * @returns {void}
 *
 * @method addParticipant - Adds a participant to an existing role.
 * @param {Participant} participant - The participant to add.
 * @returns {void}
 *
 * @method removeParticipant - Removes a participant from a specific role.
 * @param {string} role - The name or ID of the role.
 * @param {string} participant - The identifier of the participant to remove.
 * @returns {void}
 */
export type RolesState = {
  /* ------------ ROLE OPERATIONS ------------ */
  roles: Role[];
  addRole(role: Role): void;
  removeRole(role: string): void;
  setRoles: Setter<Role[]>;
};

const rolesStateSlice: StateCreator<RFState, [], [], RolesState> = (
  set,
  get
) => ({
  /* ------------ ROLE OPERATIONS ------------ */
  roles: state.roles ?? [],
  addRole(...roles: Role[]) {
    for (const role of roles)
      get().log(`Added a new role ${role.role} with label ${role.label}.`);

    get().setRoles((prev) => [
      ...roles.map((r) => ({ ...r, role: fixRole(r.role) })),
      ...prev,
    ]);
  },
  removeRole(...roles: string[]) {
    for (const role of roles) get().log(`Removed role ${role}.`);

    get().setRoles((prev) => prev.filter((rl) => !roles.includes(rl.role)));
  },
  setRoles: (updater) => {
    set((state) => ({
      roles: typeof updater === "function" ? updater(state.roles) : updater,
    }));
    get().saveState();
  },
  /* ----------------------------------------- */
});

export default rolesStateSlice;
