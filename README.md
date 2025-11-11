# DCR Choreographies Visual Editor

[![version](https://img.shields.io/badge/version-0.1.0-blue.svg)]()

A visual editor for DCR (Dynamic Condition Response) choreographies. It provides an interactive graph editor to design, inspect and simulate DCR choreographies with support for roles, parameters, node/edge documentation and a simulation mode.

## Why this project is useful

- Visual, drag-and-drop editing of DCR choreographies.
- Per-node and per-edge documentation and metadata.
- Simulation support to step through choreographies and inspect execution state.
- Auto-save behavior in the editor: edits propagate to the store so views remain consistent.
- Built with React, Zustand for state, and ReactFlow for graph rendering — easy to extend.

## Table of contents

- [What it does](#what-the-project-does)
- [Key features](#key-features)
- [Quick start](#quick-start)
- [Project structure](#project-structure-high-level)

## What the project does

- Lets users create, edit and simulate choreographies built as node/edge graphs.
- Stores node/edge metadata (guards, markings, input types, documentation).
- Allows nested subgraphs (nests/subprocesses) and supports role/parameter management.

## Key features

- Node and edge property panels (auto-save on change).
- Subgraph (nest/subprocess) editing and automatic edge management for nest types.
- Documentation panels per element.
- Simulation state store with marking and execution tracking.
- Reusable UI components (drawer menus, form fields) and a modular codebase.

## Quick start

### Prerequisites

- Node.js (LTS recommended, >=16)
- npm (or use yarn if preferred)

### Install and run (development)

1. **Open a terminal** (PowerShell / Command Prompt) at the repo root:

```powershell
# install backend deps
cd .\src\backend\
npm install
```

2. Next, install all **dependencies** of the editor using `npm`:

```console
cd ..
npm install
```

3. Then, simply just **run** the editor using (both backend and frontend will run):

```console
npm run dev
```

## Project structure (high level)

- `src/`
  - `backend/` - Backend server (api, persistence)
  - `components/`
    - `drawer-menus/ NodeMenu, EdgeMenu, SubgraphMenu, ChoreographyMenu, ...`
  - `lib/` - Reusable UI components
  - `stores/` - Zustand stores (simulation-state, app store, ...)
  - `styles/` - Tailwind / CSS assets
- `README.md`
