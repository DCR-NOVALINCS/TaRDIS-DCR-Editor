import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";
import { Participant, RoleParticipants as Role, SimpleRole } from "@/lib/types";

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
  rolesParticipants: Role[];
  addRole(role: SimpleRole): void;
  removeRole(role: string): void;
  setRoles(roles: Role[]): void;

  /* --------- PARTICIPANT OPERATIONS -------- */
  addParticipant(participant: Participant): void;
  removeParticipant(role: string, participant: string): void;
  /* ----------------------------------------- */
};

const rolesStateSlice: StateCreator<RFState, [], [], RolesState> = (
  set,
  get
) => ({
  /* ------------ ROLE OPERATIONS ------------ */
  rolesParticipants: [
    {
      role: "Prosumer",
      label: "P",
      types: [{ var: "id", type: "Integer" }],
      participants: ["P(id=1)", "P(id=2)"],
    },
    {
      role: "Public",
      label: "Public",
      types: [],
      participants: [],
    },
  ],
  addRole(role: SimpleRole) {
    const fixedRole = role.role.charAt(0).toUpperCase() + role.role.slice(1);
    set({
      rolesParticipants: [
        {
          ...role,
          role: fixedRole,
          participants: [],
        },
        ...get().rolesParticipants,
      ],
    });
    get().log(`Added a new role ${role.role} with label ${role.label}.`);
  },
  removeRole(role: string) {
    set({
      rolesParticipants: get().rolesParticipants.filter(
        (rl) => rl.role !== role
      ),
    });
    get().log(`Removed role ${role}.`);
  },
  setRoles(roles: Role[]) {
    set({
      rolesParticipants: roles,
    });
  },
  /* ----------------------------------------- */

  /* --------- PARTICIPANT OPERATIONS -------- */
  addParticipant(participant: Participant) {
    const { role, inputs } = participant;
    const size = inputs.length;

    set({
      rolesParticipants: get().rolesParticipants.map((rl) => {
        if (rl.role === role) {
          let part = rl.label;
          if (size > 0) {
            part += "(";
            inputs.forEach((t, i) => {
              if (i < size - 1) part += t.var + "=" + t.input + ", ";
              else part += t.var + "=" + t.input + ")";
            });
          }
          return {
            ...rl,
            participants: [...rl.participants, part],
          };
        } else return rl;
      }),
    });
  },
  removeParticipant(role: string, participant: string) {
    set({
      rolesParticipants: get().rolesParticipants.map((rl) => {
        if (rl.role === role) {
          return {
            ...rl,
            participants: rl.participants.filter((p) => p !== participant),
          };
        } else return rl;
      }),
    });
  },
  /* ----------------------------------------- */
});

export default rolesStateSlice;
