import { Button, Modal } from "@/lib/reusable-comps";
import { generateJsonData } from "@/lib/utils";
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
  nextNodeId: state.nextNodeId,
  nextGroupId: state.nextGroupId,
  nextSubprocessId: state.nextSubprocessId,
  code: state.code,
});

const fileTypes = ["-", "JSON", "PNG", "ReGraDa"];
const jsonData = ["All", "Reduced"];
const WIDTH = 1920;
const HEIGHT = 1080;

export default function ExportButton() {
  const {
    nodes,
    edges,
    roles,
    security,
    nextNodeId,
    nextGroupId,
    nextSubprocessId,
    code,
  } = useStore(selector, shallow);

  const jsonDownload = (name: string, full: boolean) => {
    const jsonString = JSON.stringify(
      full
        ? generateJsonData(
            true,
            nodes,
            edges,
            security,
            roles,
            code,
            nextNodeId,
            nextGroupId,
            nextSubprocessId
          )
        : generateJsonData(false, nodes, edges, security, roles, code),
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
  const [data, setData] = useState(jsonData[0]);
  const [name, setName] = useState("");

  const onClick = () => {
    switch (type) {
      case "JSON":
        jsonDownload(name, data === "All");
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

  const onClose = () => {
    setOpen(false);
    setType(fileTypes[0]);
    setData(jsonData[0]);
    setName("");
  };

  return (
    <>
      <Button
        className="flex items-center justify-center gap-2 w-full"
        onClick={() => setOpen(true)}
      >
        Export File
        <FolderOutput size={20} />
      </Button>
      <Modal open={open} onClose={onClose}>
        <div className="flex flex-col gap-4 mt-10">
          <h1 className="font-bold text-lg flex items-center justify-center gap-2 absolute top-3 left-3">
            Export File
            <FolderOutput size={20} />
          </h1>
          <div className="flex items-center justify-center gap-6">
            <label className="flex items-center justify-start h-8 w-8">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border-2 w-40 h-8 rounded-sm font-mono"
            >
              {fileTypes.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {type === "JSON" && (
            <div className="flex items-center justify-center gap-6">
              <label className="flex items-center justify-start h-8 w-8">
                Data
              </label>
              <select
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="border-2 w-40 h-8 rounded-sm font-mono"
              >
                {jsonData.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
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
