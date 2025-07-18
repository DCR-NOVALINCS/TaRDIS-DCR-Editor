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

const selector = (state: RFState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
  edges: state.edges,
  setEdges: state.setEdges,
  rolesParticipants: state.rolesParticipants,
  security: state.security,
  code: state.code,
  setCode: state.setCode,
  setProjectionInfo: state.setProjectionInfo,
  currentProjection: state.currentProjection,
  clearProjections: state.clearProjections,
  setSecurity: state.setSecurity,
  setRoles: state.setRoles,
  changeNodes: state.changeNodes,
  setDrawerSelectedCode: state.setDrawerSelectedCode,
  setDrawerSelectedLogs: state.setDrawerSelectedLogs,
  setDrawerWidth: state.setDrawerWidth,
  log: state.log,
  setIds: state.setIds,
});

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
    rolesParticipants,
    security,
    code,
    setCode,
    currentProjection,
    setProjectionInfo,
    clearProjections,
    setSecurity,
    setRoles,
    changeNodes,
    setDrawerSelectedCode,
    setDrawerSelectedLogs,
    setDrawerWidth,
    log,
    setIds,
  } = useStore(selector, shallow);

  const generateGraph = async () => {
    if (code) {
      const {
        roles,
        security,
        nodes: newNodes,
        edges: newEdges,
        nodeId,
        subId,
      } = visualGen(code);

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(newNodes, newEdges);

      changeNodes();

      await delay(20);

      clearProjections(true);

      await delay(10);

      setRoles(roles);
      setSecurity(security);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setIds([nodeId], [0], [subId]);
      log(`Graph generated.`);
    }
  };

  const compileCode = async () => {
    if (code) {
      let projections: ChoreographyModel[] | CompileError[] = [];
      const fetchFun = async () => {
        fetch("/api/code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
          }),
        })
          .then((res) => res.text())
          .then((data) => console.log(data));

        changeNodes();

        await delay(200);

        clearProjections(false);
        await delay(100);

        const response = await fetch("/api/projections");
        projections = await response.json();

        projections.forEach((proj, i) => {
          if ("compileError" in proj) treatErrors(proj);
          else {
            if (i === 0) {
              clearErrors();
              setDrawerSelectedCode(false);
              setDrawerSelectedLogs(true);
              setDrawerWidth("25%");
              log("Typecheck and compilation succeeded.");
            }
            if (proj.graph.events && proj.graph.relations) {
              const result = processChoregraphyModel(proj);
              const layoutedResult = getLayoutedElements(
                result.nodes,
                result.edges
              );
              setProjectionInfo(proj.role.label, layoutedResult);
              log(`Projection for role ${proj.role.label} created.`);
            }
          }
        });
      };
      fetchFun();
    }
  };

  const setNewCode = async () => {
    changeNodes();

    await delay(20);

    const projection = clearProjections(
      currentProjection === "global" ? true : false
    );

    await delay(10);

    if (projection) {
      const newCode = writeCode(
        projection.nodes,
        projection.edges,
        rolesParticipants,
        security
      );
      console.log(newCode);
      setCode(newCode);
    } else setCode(writeCode(nodes, edges, rolesParticipants, security));

    log(`Generated new code.`);
  };

  /**
   * Initiates a download of the current code as a plain text file named "regrada.txt".
   *
   * This function creates a Blob from the `code` variable, generates a temporary object URL,
   * and programmatically triggers a download by creating and clicking an anchor element.
   * After the download is triggered, the anchor is removed from the DOM and the object URL is revoked.
   */
  const downloadCode = () => {
    if (code) {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "regrada.txt";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    }
  };

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco();
  const handleEditorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;
  };

  function clearErrors() {
    const model = editorRef.current?.getModel();
    if (!model || !monaco) return;

    monaco.editor.setModelMarkers(model, "owner", []);
  }

  function treatErrors(compileError: CompileError) {
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
  }

  return (
    <div
      className="w-[calc(100%-4px)] overflow-y-auto p-2 flex flex-col items-center justify-center gap-2 select-none"
      style={{ height: "calc(100vh - 50px)" }}
    >
      <Editor
        className="w-full h-[520px]"
        value={code}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          scrollBeyondLastLine: false,
        }}
        onChange={(newCode) => setCode(newCode ? newCode : "")}
        onMount={(editor) => handleEditorDidMount(editor)}
      />
      <div className="flex gap-2 w-full">
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={setNewCode}
        >
          Generate Code
        </button>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={compileCode}
        >
          Compile
        </button>

        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={downloadCode}
        >
          Download Code
        </button>
        <button
          className="bg-black h-8 w-full rounded-sm cursor-pointer font-semibold text-white hover:opacity-75"
          onClick={generateGraph}
        >
          Generate Graph
        </button>
      </div>
    </div>
  );
}
