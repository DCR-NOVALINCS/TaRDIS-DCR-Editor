import { StateCreator } from "zustand/vanilla";
import { RFState } from "./store";

interface Input {
  var: string;
  input: string;
}

interface Participant {
  role: string;
  inputs: Input[];
}

interface Parameter {
  var: string;
  type: string;
}

interface SimpleRole {
  role: string;
  label: string;
  types: Parameter[];
}

export interface Role extends SimpleRole {
  participants: string[];
}

export type RolesState = {
  /* ------------ ROLE OPERATIONS ------------ */
  rolesParticipants: Role[];
  addRole(role: SimpleRole): void;
  removeRole(role: string): void;

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
        ...get().rolesParticipants,
        {
          ...role,
          role: fixedRole,
          participants: [],
        },
      ],
    });
  },
  removeRole(role: string) {
    set({
      rolesParticipants: get().rolesParticipants.filter(
        (rl) => rl.role !== role
      ),
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
