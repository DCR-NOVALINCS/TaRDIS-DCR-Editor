import { type Node, type Edge, isNode } from "@xyflow/react";

import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { useState } from "react";

import { ChevronRight } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import ChoreographyMenu from "./drawer-menus/ChoreographyMenu";
import NodeMenu from "./drawer-menus/NodeMenu";
import SubgraphMenu from "./drawer-menus/SubgraphMenu";
import EdgeMenu from "./drawer-menus/EdgeMenu";
import LogsMenu from "./drawer-menus/LogsMenu";
import CodeMenu from "./drawer-menus/CodeMenu";

const selector = (state: RFState) => ({
  selectedElement: state.selectedElement,
  drawerOpen: state.drawerOpen,
  setDrawerOpen: state.setDrawerOpen,
  drawerSelectedLogs: state.drawerSelectedLogs,
  setDrawerSelectedLogs: state.setDrawerSelectedLogs,
  drawerSelectedCode: state.drawerSelectedCode,
  setDrawerSelectedCode: state.setDrawerSelectedCode,
  drawerWidth: state.drawerWidth,
  setDrawerWidth: state.setDrawerWidth,
});

/**
 * Drawer component that provides a collapsible side panel with tabbed content.
 *
 * The Drawer can be toggled open or closed and displays different menus based on the selected tab:
 * - Properties: Shows properties of the selected element (node, edge, or choreography).
 * - Logs: Displays logs related to the selected element.
 * - Code: Shows code related to the selected element and expands the drawer width.
 *
 * The component uses Framer Motion for smooth animations and transitions.
 * The content displayed is determined by the current selection in the application's store.
 *
 * @returns {JSX.Element} The rendered Drawer component.
 */
export default function Drawer() {
  const {
    selectedElement,
    drawerOpen,
    setDrawerOpen,
    drawerSelectedLogs,
    setDrawerSelectedLogs,
    drawerSelectedCode,
    setDrawerSelectedCode,
    drawerWidth,
    setDrawerWidth,
  } = useStore(selector, shallow);

  return (
    <>
      {/* DRAWER */}
      <motion.div
        initial={{ width: 16 }}
        animate={{ width: drawerOpen ? drawerWidth : 16 }}
        exit={{ width: 16 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute h-full right-0 bg-[#D9D9D9] drop-shadow-lg border-l-2 border-[#CCCCCC] overflow-hidden select-none"
      >
        {/* DRAWER TOGGLE BUTTON */}
        <motion.div
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="cursor-pointer flex items-center justify-center w-4 h-full border-r-2 border-[#CCCCCC]"
        >
          <motion.div
            animate={{ rotate: drawerOpen ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight />
          </motion.div>
        </motion.div>

        {/* DRAWER CONTENT */}
        <AnimatePresence>
          {drawerOpen ? (
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
                    setDrawerSelectedLogs(false);
                    setDrawerWidth("25%");
                    setDrawerSelectedCode(false);
                  }}
                >
                  Properties
                </div>
                <div
                  className="cursor-pointer w-1/3 p-2 border-r-2 border-[#CCCCCC] justify-center flex items-center"
                  onClick={() => {
                    setDrawerSelectedLogs(true);
                    setDrawerWidth("25%");
                    setDrawerSelectedCode(false);
                  }}
                >
                  Logs
                </div>
                <div
                  className="cursor-pointer w-1/3 p-2 border-r-2 border-[#CCCCCC] justify-center flex items-center"
                  onClick={() => {
                    setDrawerSelectedCode(true);
                    setDrawerWidth("50%");
                    setDrawerSelectedLogs(false);
                  }}
                >
                  Code
                </div>
              </div>
              {drawerSelectedLogs ? (
                <LogsMenu />
              ) : drawerSelectedCode ? (
                <CodeMenu />
              ) : selectedElement ? (
                isNode(selectedElement) ? (
                  selectedElement.type === "event" ? (
                    <NodeMenu
                      key={(selectedElement as Node).id}
                      node={selectedElement as Node}
                    />
                  ) : (
                    <SubgraphMenu
                      key={(selectedElement as Node).id}
                      nest={selectedElement as Node}
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
