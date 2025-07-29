import { writeCode } from "@/lib/codegen";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import Editor, { useMonaco } from "@monaco-editor/react";
import * as monacoEditor from "monaco-editor";
import { delay, getLayoutedElements } from "@/lib/utils";

import { visualGen } from "@/lib/visualgen-code";
import { processChoregraphyModel } from "@/lib/visualgen-json";
import { ChoreographyModel, CompileError } from "@/lib/types";
import { useRef } from "react";
import { Button } from "@/lib/reusable-comps";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
  edges: state.edges,
  setEdges: state.setEdges,
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

const BUTTON_ACTIONS = [
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
] as const;

/**
 * `CodeMenu` is a React functional component that provides a code editor interface
 * for viewing, editing, generating, and downloading code within the application.
 *
 * Features:
 * - Displays a code editor (Monaco Editor) with Python-like syntax highlighting.
 * - Allows users to generate code based on the current application state (nodes, edges, roles, security).
 * - Enables users to download the current code as a `.txt` file.
 * - (Commented out) Option to save changes made in the editor back to the application's visual state.
 *
 * State Management:
 * - Utilizes a custom store via `useStore` to access and update code, event maps, and related data.
 *
 * UI:
 * - Responsive layout with labeled sections and styled buttons for user actions.
 *
 * @component
 * @returns {JSX.Element} The rendered CodeMenu component.
 */
export default function CodeMenu() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
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
  } = useStore(selector, shallow);

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco();

  const clearErrors = () => {
    const model = editorRef.current?.getModel();
    if (!model || !monaco) return;

    monaco.editor.setModelMarkers(model, "owner", []);
  };

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

  const switchToLogsTab = () => {
    setDrawerSelectedCode(DRAWER_CONFIG.CODE_TAB);
    setDrawerSelectedLogs(DRAWER_CONFIG.LOGS_TAB);
    setDrawerWidth(DRAWER_CONFIG.WIDTH);
  };

  const processProjection = (proj: ChoreographyModel, index: number) => {
    if (index === 0) {
      clearErrors();
      switchToLogsTab();
      log("Typecheck and compilation succeeded.");
    }

    if (proj.graph.events && proj.graph.relations) {
      const result = processChoregraphyModel(proj);
      const layoutedResult = getLayoutedElements(result.nodes, result.edges);
      setProjectionInfo(proj.role.label, layoutedResult);
      log(`Projection for role ${proj.role.label} created.`);
    }
  };

  const generateGraph = async () => {
    if (!code) return;

    const {
      roles,
      security,
      nodes: newNodes,
      edges: newEdges,
      nodeId,
      subId,
    } = visualGen(code);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges
    );

    clearProjections(true);
    await delay(DELAYS.CLEAR_PROJECTIONS);

    setRoles(roles);
    setSecurity(security);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setIds([nodeId], [0], [subId]);
    log("Graph generated.");
  };

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
      const response = await fetch("/api/projections");
      const projections: ChoreographyModel[] | CompileError[] =
        await response.json();

      // Process each projection
      projections.forEach((proj, index) => {
        if ("compileError" in proj) treatErrors(proj);
        else processProjection(proj, index);
      });
    } catch (error) {
      console.error("Compilation failed:", error);
      log("Compilation failed. Please check your code.");
    }
  };

  const generateCode = async () => {
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
  };

  return (
    <div
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2 select-none"
      style={{ height: "calc(100vh - 50px)" }}
    >
      <Editor
        className={`w-full h-full`}
        value={code}
        options={EDITOR_CONFIG_OPTIONS}
        onChange={(newCode) => setCode(newCode || "")}
        onMount={(editor: monacoEditor.editor.IStandaloneCodeEditor) =>
          (editorRef.current = editor)
        }
      />

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
      </div>
    </div>
  );
}
