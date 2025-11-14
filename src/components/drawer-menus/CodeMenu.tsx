import { writeCode } from "@/lib/codegen";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import Editor, { useMonaco } from "@monaco-editor/react";
import * as monacoEditor from "monaco-editor";
import { getLayoutedElements } from "@/lib/elk";

import { visualGen } from "@/lib/visualgen-code";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/lib/reusable-comps";
import { ChoreographyModel, CompileError } from "@/lib/types";
import { processChoregraphyModel } from "@/lib/visualgen-json";
import { delay } from "@/lib/utils";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  addEdge: state.addEdge,
  roles: state.roles,
  security: state.security,
  code: state.code,
  setCode: state.setCode,
  setProjectionInfo: state.setProjectionInfo,
  clearProjections: state.clearProjections,
  setSecurity: state.setSecurity,
  setRoles: state.setRoles,
  setDrawerSelectedCode: state.setDrawerSelectedCode,
  setDrawerSelectedLogs: state.setDrawerSelectedLogs,
  setDrawerWidth: state.setDrawerWidth,
  log: state.log,
  setIds: state.setIds,
  drawerSelectedCode: state.drawerSelectedCode,
  isGlobalProjection: state.isGlobalProjection,
});

const DELAYS = {
  CHANGE_NODES: 20,
  CLEAR_PROJECTIONS: 100,
  COMPILE: 200,
  FETCH_PROJECTIONS: 100,
} as const;

const DRAWER_CONFIG = {
  WIDTH: "25%",
  LOGS_TAB: true,
  CODE_TAB: false,
} as const;

const EDITOR_CONFIG_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 16,
  scrollBeyondLastLine: false,
} as const;

/*const BUTTON_ACTIONS = [
  {
    label: "Generate Code",
    action: "generateCode",
  },
  {
    label: "Compile",
    action: "compile",
  },
  {
    label: "Generate Graph",
    action: "generateGraph",
  },
] as const;*/

/**
 * React component that renders a `Monaco` editor bound to the application store and
 * exposes code ↔ graph synchronization, compilation, and projection handling.
 *
 * Main responsibilities:
 * - Display and edit the choreography source code stored in the global store.
 * - Keep generated code in sync with the visual graph (nodes/edges/roles/security)
 *   unless the user is performing a manual edit inside the editor.
 * - Parse edited code (via {@link visualGen `visualGen`}) and reconcile resulting `roles`, `security`,
 *   `nodes` and `edges` with the in-memory graph. Layout computation for graph
 *   elements uses {@link getLayoutedElements `getLayoutedElements`} (ELK) before updating the store.
 * - Send the current code to the backend compilation endpoint and retrieve
 *   generated projections or compile errors, converting compile errors to `Monaco`
 *   markers for inline editor diagnostics.
 * - Convert each returned choreography projection into a layouted graph and
 *   store per-role projection info via {@link setProjectionInfo `setProjectionInfo`}.
 * - Manage editor-level interactions such as marking manual edit state when the
 *   editor is focused/blurred, and clearing/setting diagnostics via `Monaco` APIs.
 *
 * Behavior and side-effects:
 * - On graph changes, and when the editor is not in manual edit mode, the
 *   component regenerates the code with {@link writeCode `writeCode(...)`} and writes it to the
 *   store (using {@link setCode `setCode(...)`}).
 * - {@link handleCodeEdit `handleCodeEdit(newCode)`}:
 *   - Updates code in store.
 *   - Calls {@link visualGen `visualGen(...)`} to obtain new roles, security metadata, nodes, edges,
 *     and new id seeds.
 *   - Reconciles roles (adds new, updates existing, removes old).
 *   - Updates security if it has changed.
 *   - Requests layouted positions for the new nodes/edges and replaces store
 *     nodes/edges with the returned layouted graph.
 *   - Reconciles existing edges with `newEdges` (update existing edges, add new,
 *     remove obsolete).
 *   - Updates id generators (next node, group, and subprocess ids).
 * - {@link compileCode `compileCode()`}:
 *   - POSTs the current code to `/api/code` to trigger compilation.
 *   - Clears prior projections and polls for results by fetching files from
 *     `/api/retrieve-file` (attempts `choreo.json` first, falls back to
 *     `compile_error.json`).
 *   - If a compile error object is returned, maps compile error stack traces
 *     into `Monaco` markers (via {@link treatErrors `treatErrors`}).
 *   - If projections are returned, processes each projection with
 *     {@link processProjection `processProjection(...)`} which sets per-role projection info and logs
 *     success messages.
 * - {@link treatErrors `treatErrors(compileError)`}:
 *   - Maps `compileError.compileError.stackTrace` entries to `Monaco` marker
 *     objects. If an individual error lacks a location, it is represented as a
 *     file-level error (position zeros).
 * - {@link clearErrors `clearErrors()`}:
 *   - Removes all Monaco markers for the current model.
 * - {@link processProjection `processProjection(proj, index)`}:
 *   - Clears diagnostics and switches the UI to the logs tab for the first
 *     projection result, and logs typecheck/compile success. If the projection
 *     contains events or relations, converts the projection to graph elements,
 *     computes layout, stores projection info, and logs progress.
 *
 * Editor integration:
 * - Uses Editor from `@monaco-editor/react` and stores a reference to the
 *   `IStandaloneCodeEditor` in {@link editorRef `editorRef`} for direct model and marker manipulation.
 * - Uses {@link useMonaco `useMonaco()`} to access the `Monaco` API for creating/clearing diagnostics.
 * - While the editor is focused, {@link isManualEdit `isManualEdit`} is true and automatic code
 *   regeneration from graph changes is suspended to avoid overwriting user edits.
 *
 * Performance / timing:
 * - Some asynchronous operations use small delays to coordinate UI/async state
 *   transitions.
 *
 * @see {@link DELAYS `DELAYS`} for delay constants used in async operations.
 * @see {@link DRAWER_CONFIG `DRAWER_CONFIG`} for drawer UI configuration constants.
 * @see {@link EDITOR_CONFIG_OPTIONS `EDITOR_CONFIG_OPTIONS`} for `Monaco` editor configuration.
 * @see https://github.com/microsoft/monaco-editor for `Monaco` editor integration details.
 *
 * @component
 * @returns JSX element with the rendered editor and compile button UI.
 */
export default function CodeMenu() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addEdge,
    roles,
    security,
    code,
    setCode,
    setProjectionInfo,
    clearProjections,
    setSecurity,
    setRoles,
    setDrawerSelectedCode,
    setDrawerSelectedLogs,
    setDrawerWidth,
    log,
    setIds,
    drawerSelectedCode,
    isGlobalProjection,
  } = useStore(selector, shallow);

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco();

  const [isManualEdit, setIsManualEdit] = useState(false);

  const relevantNodeData = useMemo(
    () =>
      nodes.map(({ id, data, parentId, type }) => ({
        id,
        data,
        parentId,
        type,
      })),
    [nodes]
  );

  useEffect(() => {
    if (isManualEdit || !drawerSelectedCode) return;

    const newCode = writeCode(nodes, edges, roles, security);
    setCode(newCode);
  }, [isManualEdit, relevantNodeData, edges, roles, security]);

  /**
   * Handles code editing events.
   *
   * @param newCode - The updated code string.
   * @returns A promise that resolves when the code has been processed.
   */
  const handleCodeEdit = async (newCode: string) => {
    if (!newCode || !drawerSelectedCode) return;

    setCode(newCode);

    const {
      roles: newRoles,
      security: newSecurity,
      nodes: newNodes,
      edges: newEdges,
      nodeId,
      subId,
    } = visualGen(newCode);

    let rolesTreated = roles.map((r) => ({
      label: r.label.trim(),
      treated: false,
    }));

    newRoles.forEach((r) => {
      const roleToChange = roles.find((rl) => rl.label === r.label);
      if (roleToChange) {
        rolesTreated = rolesTreated.map((role) =>
          role.label === r.label ? { ...role, treated: true } : role
        );

        setRoles((prev) => prev.map((rl) => (rl.label === r.label ? r : rl)));
      } else setRoles((prev) => [...prev, r]);
    });

    rolesTreated
      .filter((r) => !r.treated)
      .forEach((r) =>
        setRoles((prev) => prev.filter((rl) => rl.label !== r.label))
      );

    if (newSecurity !== security) setSecurity(newSecurity);

    const layoutedNodesEdges = await getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodesEdges.nodes);

    /* const allNodes = nodes.filter(
        (nd) => nd.parentId === n.parentId && nd.data.label === n.data.label
      );

      if (allNodes.length === 0) {
        setNodes((prev) => [...prev, n]);
        nodesTreated.push({ id: n.id, treated: true });
      } else if (allNodes.length > 1) continue;
      else {
        const nodeToChange = allNodes[0];

        nodesTreated = nodesTreated.map((node) =>
          node.id === nodeToChange.id ? { ...node, treated: true } : node
        );
        setNodes((prev) =>
          prev.map((nd) =>
            nd.id === nodeToChange.id
              ? {
                  ...nodeToChange,
                  width: nd.width,
                  height: nd.height,
                  parentId: nd.parentId,
                  position: nd.position,
                }
              : nd
          )
        );
      } 
    }
      
    nodesTreated
      .filter((n) => !n.treated)
      .forEach((n) => setNodes((prev) => prev.filter((nd) => nd.id !== n.id)));
    */

    let edgesTreated = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      treated: false,
    }));

    newEdges.forEach((e) => {
      console.log("Checking edge", e.source, e.target, e.type);
      const edgeToChange = edges.find(
        (ed) =>
          ed.source === e.source && ed.target === e.target && ed.type === e.type
      );

      if (edgeToChange) {
        edgesTreated = edgesTreated.map((edge) =>
          edge.id === edgeToChange.id ? { ...edge, treated: true } : edge
        );
        setEdges((prev) =>
          prev.map((ed) =>
            ed.id === edgeToChange.id ? { ...e, id: ed.id } : ed
          )
        );
      } else addEdge(e);
    });

    edgesTreated
      .filter((e) => !e.treated)
      .forEach((e) => setEdges((prev) => prev.filter((ed) => ed.id !== e.id)));

    setIds({
      nextNodeId: [nodeId],
      nextGroupId: [0],
      nextSubprocessId: [subId],
    });
  };

  /**
   * Clears all error markers from the editor.
   */
  const clearErrors = () => {
    const model = editorRef.current?.getModel();
    if (!model || !monaco) return;

    monaco.editor.setModelMarkers(model, "owner", []);
  };

  /**
   * Treats compilation errors by displaying them in the editor.
   *
   * @param compileError - The compilation error object to process.
   */
  const treatErrors = (compileError: CompileError) => {
    const model = editorRef.current?.getModel();
    if (!model || !monaco) return;

    const markers = compileError.compileError.stackTrace.map((err) =>
      err.location
        ? {
            severity: monaco.MarkerSeverity.Error,
            message: err.message,
            startLineNumber: err.location.from.line,
            startColumn: err.location.from.column,
            endLineNumber: err.location.to.line,
            endColumn: err.location.to.column,
          }
        : {
            severity: monaco.MarkerSeverity.Error,
            message: err.message,
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 0,
          }
    );

    monaco.editor.setModelMarkers(model, "owner", markers);
  };

  /**
   * Switches the drawer to the logs tab with appropriate width.
   */
  const switchToLogsTab = () => {
    setDrawerSelectedCode(DRAWER_CONFIG.CODE_TAB);
    setDrawerSelectedLogs(DRAWER_CONFIG.LOGS_TAB);
    setDrawerWidth(DRAWER_CONFIG.WIDTH);
  };

  /**
   * Processes a choreography projection by updating the editor and state.
   *
   * @param proj - The choreography projection to process.
   * @param index - The index of the projection in the list.
   */
  const processProjection = async (proj: ChoreographyModel, index: number) => {
    if (index === 0) {
      clearErrors();
      switchToLogsTab();
      log("Typecheck and compilation succeeded.");
    }

    if (proj.graph.events || proj.graph.relations) {
      const result = processChoregraphyModel(proj);
      const layoutedResult = await getLayoutedElements(
        result.nodes,
        result.edges
      );
      setProjectionInfo(proj.role.label, layoutedResult);
      log(`Projection for role ${proj.role.label} created.`);
    }
  };

  /*const generateGraph = async () => {
    if (!code) return;

    const {
      roles,
      security,
      nodes: newNodes,
      edges: newEdges,
      nodeId,
      subId,
    } = visualGen(code);
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      await getLayoutedElements(newNodes, newEdges);

    clearProjections(true);
    await delay(DELAYS.CLEAR_PROJECTIONS);

    setRoles(roles);
    setSecurity(security);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setIds([nodeId], [0], [subId]);
    log("Graph generated.");
  };*/

  /**
   * Compiles the code in the editor.
   *
   * @returns A promise that resolves when the compilation is complete.
   */
  const compileCode = async () => {
    if (!code) return;

    try {
      // Send code for compilation
      await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.text())
        .then(console.log);

      clearProjections(false);
      await delay(DELAYS.FETCH_PROJECTIONS);

      // Fetch projections
      //const response = await fetch("/api/projections");
      //const projections: ChoreographyModel[] | CompileError[] =
      //  await response.json();

      const name = "choreo.json";
      let response = await fetch("/api/retrieve-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir: "_out", name }),
      });

      if (!response.ok) {
        response = await fetch("/api/retrieve-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dir: "_out", name: "compile_error.json" }),
        });
      }

      const projections = (await response.json()) as
        | ChoreographyModel[]
        | CompileError;

      // Process each projection
      if ("compileError" in projections)
        treatErrors(projections as CompileError);
      else {
        for (const [index, proj] of projections.entries())
          await processProjection(proj, index);

        const blob = new Blob([JSON.stringify(projections)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.setAttribute("download", name);
        a.setAttribute("href", url);

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Compilation failed:", error);
      log("Compilation failed. Please check your code.");
    }
  };

  /*const generateCode = async () => {
    const { nodes: newNodes, edges: newEdges } = await clearProjections(false);
    await delay(DELAYS.CLEAR_PROJECTIONS);

    const newCode = writeCode(newNodes, newEdges, roles, security);

    setCode(newCode);
    log("Generated new code.");
  };

  const handleButtonClick = (action: string) => {
    const actions = {
      generateCode,
      compile: compileCode,
      generateGraph,
    };

    const actionHandler = actions[action as keyof typeof actions];
    if (actionHandler) actionHandler();
  };*/

  return (
    <div
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2 select-none"
      style={{ height: "calc(100vh - 50px)" }}
    >
      {isGlobalProjection() && (
        <Editor
          className={`w-full h-full`}
          value={code}
          options={EDITOR_CONFIG_OPTIONS}
          onChange={(newCode) => handleCodeEdit(newCode || "")}
          onMount={(editor: monacoEditor.editor.IStandaloneCodeEditor) => {
            editorRef.current = editor;

            if (drawerSelectedCode) {
              editor.onDidFocusEditorText(() => {
                setIsManualEdit(true);
              });

              editor.onDidBlurEditorText(() => {
                setIsManualEdit(false);
              });
            }
          }}
        />
      )}

      <div className="flex gap-2 w-full">
        <Button
          className="w-full"
          key={"compile"}
          onClick={() => compileCode()}
        >
          Compile
        </Button>
      </div>
      {/*
      <div className="flex gap-2 w-full">
        {BUTTON_ACTIONS.map(({ label, action }) => (
          <Button
            className="w-full"
            key={action}
            onClick={() => handleButtonClick(action)}
          >
            {label}
          </Button>
        ))}
      </div>*/}
    </div>
  );
}
