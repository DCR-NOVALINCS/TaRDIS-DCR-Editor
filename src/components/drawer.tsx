import { type Node, type Edge, isNode } from "@xyflow/react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { useState } from "react";

import { ChevronRight } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import ChoreographyMenu from "./drawer-menus/ChoreographyMenu";
import { NodeMenu } from "./drawer-menus/NodeMenu";
import { SubgraphMenu } from "./drawer-menus/SubgraphMenu";
import { EdgeMenu } from "./drawer-menus/EdgeMenu";
import LogsMenu from "./drawer-menus/LogsMenu";
import CodeMenu from "./drawer-menus/CodeMenu";

const selector = (state: RFState) => ({
  selectedElement: state.selectedElement,
});

/**
 * Component that shows the properties of selected element or choreography if no element is selected.
 * @returns the drawer for properties editing.
 */
export default function Drawer() {
  const { selectedElement } = useStore(selector, shallow);

  const [open, setOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(false);
  const [selectedCode, setSelectedCode] = useState(false);
  const [width, setWidth] = useState("25%");

  return (
    <>
      {/* DRAWER */}
      <motion.div
        initial={{ width: 16 }}
        animate={{ width: open ? width : 16 }}
        exit={{ width: 16 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute h-full right-0 bg-[#D9D9D9] drop-shadow-lg border-l-2 border-[#CCCCCC] overflow-hidden"
      >
        {/* DRAWER TOGGLE BUTTON */}
        <motion.div
          onClick={() => setOpen(!open)}
          className="cursor-pointer flex items-center justify-center w-4 h-full border-r-2 border-[#CCCCCC]"
        >
          <motion.div
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight />
          </motion.div>
        </motion.div>

        {/* DRAWER CONTENT */}
        <AnimatePresence>
          {open ? (
            <motion.div
              key="0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-4 w-[calc(100%-12px)] flex flex-col text-black"
            >
              <div className="flex relative border-b-2 font-bold border-[#CCCCCC] ">
                <div
                  className="cursor-pointer w-1/3 p-2 border-r-2 border-[#CCCCCC] justify-center flex items-center"
                  onClick={() => {
                    setSelectedLogs(false);
                    setWidth("25%");
                    setSelectedCode(false);
                  }}
                >
                  Properties
                </div>
                <div
                  className="cursor-pointer w-1/3 p-2 border-r-2 border-[#CCCCCC] justify-center flex items-center"
                  onClick={() => {
                    setSelectedLogs(true);
                    setWidth("25%");
                    setSelectedCode(false);
                  }}
                >
                  Logs
                </div>
                <div
                  className="cursor-pointer w-1/3 p-2 border-r-2 border-[#CCCCCC] justify-center flex items-center"
                  onClick={() => {
                    setSelectedCode(true);
                    setWidth("50%");
                    setSelectedLogs(false);
                  }}
                >
                  Code
                </div>
              </div>
              {selectedLogs ? (
                <LogsMenu />
              ) : selectedCode ? (
                <CodeMenu />
              ) : selectedElement ? (
                isNode(selectedElement) ? (
                  selectedElement.type === "nest" ||
                  selectedElement.type === "subprocess" ? (
                    <SubgraphMenu
                      key={(selectedElement as Node).id}
                      nest={selectedElement as Node}
                    />
                  ) : (
                    <NodeMenu
                      key={(selectedElement as Node).id}
                      node={selectedElement as Node}
                    />
                  )
                ) : (
                  <EdgeMenu
                    key={(selectedElement as Edge).id}
                    edge={selectedElement as Edge}
                  />
                )
              ) : (
                <ChoreographyMenu />
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
