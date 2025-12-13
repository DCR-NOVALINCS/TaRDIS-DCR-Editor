export const relationsMap: { [rel: string]: string } = {
  condition: "-->*",
  response: "*-->",
  include: "-->+",
  exclude: "-->%",
  milestone: "--><>",
  spawn: "-->>",
};

export interface Event {
  id: string;
  label: string;
  name: string;
  security: string;
  input?: Input;
  expression?: string;
  initiators: string[];
  receivers?: string[];
  marking: Marking;
  parent: string;
}

export interface Subprocess {
  id: string;
  label: string;
  marking: Marking;
  parent: string;
}

export interface Nest extends Subprocess {
  nestType: string;
}

export type Input = { type: string } | { type: "Record"; record: Field[] };

export interface Field {
  var: string;
  type: string;
}

export type ProcessNode = Event | Nest | Subprocess;

export interface Process {
  events: Event[];
  relations: Relation[];
  nests?: Nest[];
  subprocesses?: Subprocess[];
  parentProcess: string;
}

export interface Marking {
  included: boolean;
  pending: boolean;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: string;
  parent?: string;
  guard?: string;
}

export interface RelationCreationParams {
  id: string;
  source: string;
  target: string;
  type: string;
  guard?: string;
  sourceNode: ProcessNode;
  targetNode: ProcessNode;
  events: Event[];
  nests: Nest[];
  subprocesses: Subprocess[];
}

export interface Role {
  role: string;
  label: string;
  fields: Field[];
}
