import { Button, Modal } from "@/lib/reusable-comps";
import { State } from "@/lib/types";
import { getLayoutedElements, delay } from "@/lib/utils";
import { visualGen } from "@/lib/visualgen-code";
import useStore, { RFState } from "@/stores/store";
import { FolderInput } from "lucide-react";
import { useState } from "react";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  setSecurity: state.setSecurity,
  setRoles: state.setRoles,
  setIds: state.setIds,
  setCode: state.setCode,
  clearProjections: state.clearProjections,
  setProjectionInfo: state.setProjectionInfo,
  log: state.log,
  setSelectedElement: state.setSelectedElement,
});

export default function ImportButton() {
  const {
    setNodes,
    setEdges,
    setSecurity,
    setRoles,
    setIds,
    setCode,
    clearProjections,
    setProjectionInfo,
    log,
    setSelectedElement,
  } = useStore(selector, shallow);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);

  const changeClearSet = async (state: State) => {
    clearProjections(true);
    await delay(10);

    setRoles(state.roles);
    setSecurity(state.security);
    setNodes(state.nodes);
    setCode(state.code);
    setEdges(state.edges);
    setIds(state.nextNodeId, state.nextGroupId, state.nextSubprocessId);
    setProjectionInfo("global", { nodes: state.nodes, edges: state.edges });
    setSelectedElement(undefined);
  };

  const treatCode = async (code: string) => {
    setCode(code);
    const {
      roles,
      security,
      nodes: newNodes,
      edges: newEdges,
      nodeId: nextNodeId,
      subId: nextSubprocessId,
    } = visualGen(code);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges
    );

    changeClearSet({
      nodes: layoutedNodes,
      edges: layoutedEdges,
      security,
      roles,
      code,
      nextNodeId: [nextNodeId],
      nextGroupId: [0],
      nextSubprocessId: [nextSubprocessId],
    });
    log("Graph generated using code import.");
  };

  const onClick = () => {
    if (file) {
      file.text().then((text) => {
        const name = file.name;
        if (name.endsWith(".json")) {
          const json = JSON.parse(text);
          changeClearSet({
            nodes: json.nodes,
            edges: json.edges,
            security: json.security,
            roles: json.roles,
            code: json.code,
            nextNodeId: json.nextNodeId,
            nextGroupId: json.nextGroupId,
            nextSubprocessId: json.nextSubprocessId,
          });
          setCode("");
          log("Graph generated using JSON import.");
        } else if (name.endsWith(".tardisdcr")) treatCode(text);
      });
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        className="flex items-center justify-center gap-2 w-full"
        onClick={() => setOpen(true)}
      >
        Import File
        <FolderInput size={20} />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4 mt-10">
          <h1 className="font-bold text-lg flex items-center justify-center gap-2 absolute top-3 left-3">
            Import File
            <FolderInput size={20} />
          </h1>
          <div className="flex items-center justify-center gap-6">
            <label className="flex items-center justify-start h-8 w-8">
              File
            </label>
            <input
              type="file"
              onChange={(e) =>
                setFile(e.target.files ? e.target.files[0] : undefined)
              }
              className="border-2 rounded-sm w-40 h-8 px-1 text-[12px]"
            ></input>
          </div>
          <div className="flex gap-2">
            <Button className="w-full" onClick={onClick}>
              Import
            </Button>
            <Button
              className="w-full"
              onClick={() => setOpen(false)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
