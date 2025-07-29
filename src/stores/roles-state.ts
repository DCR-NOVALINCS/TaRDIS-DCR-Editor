import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import { initialState, SimpleRole, state } from "@/lib/types";

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
  roles: SimpleRole[];
  addRole(role: SimpleRole): void;
  removeRole(role: string): void;
  setRoles(roles: SimpleRole[]): void;
};

const rolesStateSlice: StateCreator<RFState, [], [], RolesState> = (
  set,
  get
) => ({
  /* ------------ ROLE OPERATIONS ------------ */
  roles: state.roles ?? [],
  addRole(role: SimpleRole) {
    set({
      roles: [
        {
          ...role,
          role: fixRole(role.role),
        },
        ...get().roles,
      ],
    });
    get().log(`Added a new role ${role.role} with label ${role.label}.`);
    get().saveState();
  },
  removeRole(role: string) {
    set({
      roles: get().roles.filter((rl) => rl.role !== role),
    });
    get().log(`Removed role ${role}.`);
    get().saveState();
  },
  setRoles(roles: SimpleRole[]) {
    set({
      roles,
    });
    get().saveState();
  },
  /* ----------------------------------------- */
});

export default rolesStateSlice;
