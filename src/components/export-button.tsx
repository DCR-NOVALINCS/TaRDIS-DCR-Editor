import { Button, Modal } from "@/lib/reusable-comps";
import useStore, { RFState } from "@/stores/store";
import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import { FolderOutput } from "lucide-react";
import { useState } from "react";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  roles: state.roles,
  security: state.security,
  projectionInfo: state.projectionInfo,
  documentation: state.documentation,
  nextNodeId: state.nextNodeId,
  nextGroupId: state.nextGroupId,
  nextSubprocessId: state.nextSubprocessId,
  code: state.code,
  isGlobalProjection: state.isGlobalProjection,
});

const fileTypes = ["-", "JSON", "PNG", "ReGraDa"];
const WIDTH = 1920;
const HEIGHT = 1080;

/**
 * A React component that renders a button which opens a modal UI to export the current
 * graph and related application state into one of several file formats.
 *
 * Behavior:
 * - Reads graph state (`nodes`, `edges`), metadata (`roles`, `security`, `documentation`, `projectionInfo`),
 *   IDs (`nextNodeId`, `nextGroupId`, `nextSubprocessId`) and source code from the application's Zustand store.
 * - Presents a modal with controls to select an export file type and specify a filename.
 * - Supports the following export types:
 *   - "JSON": serializes the graph state and related metadata to a pretty-printed JSON file
 *     and triggers a download (filename: `<name>.json`).
 *   - "PNG": captures the rendered graph viewport as a PNG using html-to-image. It computes
 *     bounds via getNodesBounds and computes a viewport with getViewportForBounds using
 *     configured {@link WIDTH `WIDTH`} and {@link HEIGHT `HEIGHT`} constants, applies the transform/zoom to the capture,
 *     and triggers a download (filename: `<name>.png`).
 *   - "ReGraDa": exports the current textual graph code to a plain text blob and triggers
 *     a download with the `.tardisdcr` extension (filename: `<name>.tardisdcr`).
 *
 * Implementation details / side effects:
 * - Uses {@link useState `useState`} to manage modal open state, selected file type, and the desired filename.
 * - Uses {@link useStore `useStore`} to subscribe to only the required parts of the global store.
 * - For JSON and ReGraDa exports, creates a {@link Blob `Blob`} and an object {@link URL `URL`}, appends a temporary
 *   anchor element to the DOM to initiate the download, removes the anchor, and revokes the URL.
 * - For PNG export, queries the DOM for the `.react-flow__viewport` element and uses {@link toPng `toPng`}
 *   to capture an image. If the element is not found, no image is produced.
 * - Ensures basic cleanup (removing temporary elements and revoking object URLs).
 *
 * Accessibility / UX:
 * - The button and modal are intended to be simple and keyboard accessible; the modal exposes
 *   {@link open `open`} and {@link onClose `onClose`} handlers so the parent modal implementation can manage focus and dismissal.
 *
 * Notes & assumptions:
 * - The component expects the application to provide the referenced reusable {@link Button `Button`} and {@link Modal `Modal`}
 *   components, the ReactFlow helper functions {@link getNodesBounds `getNodesBounds`} and {@link getViewportForBounds `getViewportForBounds`}, and
 *   html-to-image's {@link toPng `toPng`} function.
 * - {@link WIDTH `WIDTH`} and {@link HEIGHT `HEIGHT`} constants define the capture resolution for PNG exports.
 * - If the selected filename is an empty string, the browser will use the provided download
 *   attribute value; callers may want to validate or prefill a default filename in the UI.
 *
 * @component
 * @returns a JSX Element with a button that opens a modal for exporting the current graph in various formats.
 */
export default function ExportButton() {
  const {
    nodes,
    edges,
    roles,
    security,
    projectionInfo,
    documentation,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
    code,
    isGlobalProjection,
  } = useStore(selector, shallow);

  /**
   * Triggers a download of the current graph data as a JSON file.
   *
   * @param name - the desired filename (without extension)
   */
  const jsonDownload = (name: string) => {
    const jsonString = JSON.stringify(
      {
        nodes,
        edges,
        security,
        roles,
        code,
        nextNodeId,
        nextGroupId,
        nextSubprocessId,
        projectionInfo,
        documentation,
      },
      null,
      2
    );

    const blob = new Blob([jsonString], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Triggers a download of the current graph view as a PNG image.
   *
   * @param name - the desired filename (without extension)
   */
  const pngDownload = (name: string) => {
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      WIDTH,
      HEIGHT,
      0.5,
      1,
      0
    );

    const element = document.querySelector(".react-flow__viewport");
    if (element) {
      toPng(element as HTMLElement, {
        backgroundColor: "#FFFFFF",
        width: WIDTH,
        height: HEIGHT,
        style: {
          width: String(WIDTH),
          height: String(HEIGHT),
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      }).then((dataUrl) => {
        const a = document.createElement("a");

        a.setAttribute("download", `${name}.png`);
        a.setAttribute("href", dataUrl);
        a.click();
      });
    }
  };

  /**
   * Triggers a download of the current graph code as a ReGraDa (`.tardisdcr`) file.
   *
   * @param name - the desired filename (without extension)
   */
  const codeDownload = (name: string) => {
    if (!code) return;

    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.tardisdcr`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const [open, setOpen] = useState(false);
  const [type, setType] = useState(fileTypes[0]);
  const [name, setName] = useState("");

  /**
   * Handles the export button click event, triggering the appropriate download
   * based on the selected file type.
   */
  const onClick = () => {
    const newType = isGlobalProjection() ? type : "PNG";
    switch (newType) {
      case "JSON":
        jsonDownload(name);
        break;
      case "PNG":
        pngDownload(name);
        break;
      case "ReGraDa":
        codeDownload(name);
        break;
      default:
        break;
    }
  };

  /**
   * Handles closing the export modal and resetting state.
   */
  const onClose = () => {
    setOpen(false);
    setType(fileTypes[0]);
    setName("");
  };

  return (
    <>
      {/* EXPORT BUTTON THAT OPENS THE MODAL */}
      <Button
        className="flex items-center justify-center gap-2 w-full text-sm"
        onClick={() => setOpen(true)}
      >
        Export File
        <FolderOutput size={18} />
      </Button>

      {/* EXPORT MODAL */}
      <Modal open={open} onClose={onClose}>
        <div className="flex flex-col gap-4 mt-10">
          <h1 className="font-bold text-lg flex items-center justify-center gap-2 absolute top-3 left-3">
            Export File
            <FolderOutput size={20} />
          </h1>

          {/* FILE TYPE AND NAME FIELDS */}
          <div className="flex items-center justify-center gap-6">
            <label className="flex items-center justify-start h-8 w-8">
              Type
            </label>
            <select
              value={isGlobalProjection() ? type : "PNG"}
              onChange={(e) => setType(e.target.value)}
              className="border-2 w-40 h-8 rounded-sm font-mono"
              disabled={!isGlobalProjection()}
            >
              {fileTypes.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center gap-6">
            <label className="flex items-center justify-start h-8 w-8">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2 w-40 h-8 rounded-sm px-1 font-mono"
            ></input>
          </div>

          {/* EXPORT AND CANCEL BUTTONS */}
          <div className="flex gap-2">
            <Button className="w-full" onClick={onClick}>
              Export
            </Button>
            <Button className="w-full" onClick={onClose} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
