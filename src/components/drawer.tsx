import { isNode } from "@xyflow/react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { ChevronRight, Code, Logs, Pencil } from "lucide-react";
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

const DRAWER_CLOSED_WIDTH = 16;
const DRAWER_ANIMATION_DURATION = 0.2;
const CONTENT_ANIMATION_DURATION = 0.3;
const DEFAULT_WIDTH = "25%";
const CODE_WIDTH = "50%";

const TABS: {
  id: string;
  label: string;
  icon: React.ReactNode;
  width: string;
  isActive: (logs: boolean, code: boolean) => boolean;
}[] = [
  {
    id: "properties",
    label: "Properties",
    icon: <Pencil size={20} />,
    width: DEFAULT_WIDTH,
    isActive: (logs: boolean, code: boolean) => !logs && !code,
  },
  {
    id: "logs",
    label: "Logs",
    icon: <Logs size={20} />,
    width: DEFAULT_WIDTH,
    isActive: (logs: boolean, code: boolean) => logs && !code,
  },
  {
    id: "code",
    label: "Code",
    icon: <Code size={20} />,
    width: CODE_WIDTH,
    isActive: (logs: boolean, code: boolean) => code && !logs,
  },
] as const;

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

  const handleTabClick = (tabId: string, width: string) => {
    const isLogs = tabId === "logs";
    const isCode = tabId === "code";

    setDrawerSelectedLogs(isLogs);
    setDrawerSelectedCode(isCode);
    setDrawerWidth(width);
  };

  const getTabColor = (isActive: boolean) =>
    isActive ? "bg-[#CCCCCC]" : "bg-[#D9D9D9]";

  const renderContent = () => {
    if (drawerSelectedLogs) return <LogsMenu />;
    if (drawerSelectedCode) return <CodeMenu />;

    if (!selectedElement) return <ChoreographyMenu />;

    if (isNode(selectedElement)) {
      return selectedElement.type === "event" ? (
        <NodeMenu key={selectedElement.id} node={selectedElement} />
      ) : (
        <SubgraphMenu key={selectedElement.id} nest={selectedElement} />
      );
    }

    return <EdgeMenu key={selectedElement.id} edge={selectedElement} />;
  };

  return (
    <motion.div
      initial={{ width: DRAWER_CLOSED_WIDTH }}
      animate={{ width: drawerOpen ? drawerWidth : DRAWER_CLOSED_WIDTH }}
      exit={{ width: DRAWER_CLOSED_WIDTH }}
      transition={{ duration: DRAWER_ANIMATION_DURATION, ease: "easeInOut" }}
      className="absolute h-full right-0 bg-[#D9D9D9] drop-shadow-lg border-l-2 border-[#CCCCCC] overflow-hidden select-none z-10"
    >
      {/* DRAWER TOGGLE BUTTON */}
      <motion.div
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="cursor-pointer flex items-center justify-center w-4 h-full border-r-2 border-[#CCCCCC]"
      >
        <motion.div
          animate={{ rotate: drawerOpen ? 0 : 180 }}
          transition={{ duration: CONTENT_ANIMATION_DURATION }}
        >
          <ChevronRight />
        </motion.div>
      </motion.div>

      {/* DRAWER CONTENT */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: CONTENT_ANIMATION_DURATION }}
            className="absolute top-0 left-4 w-[calc(100%-12px)] flex flex-col text-black"
          >
            {/* TABS */}
            <div className="flex relative border-b-2 font-bold border-[#CCCCCC]">
              {TABS.map((tab, index) => {
                const isActive = tab.isActive(
                  drawerSelectedLogs,
                  drawerSelectedCode
                );
                const isLastTab = index === TABS.length - 1;

                return (
                  <div
                    key={tab.id}
                    className={`
                      cursor-pointer w-1/3 p-2 justify-center flex items-center gap-2
                      ${getTabColor(isActive)}
                      ${!isLastTab ? "border-r-2 border-[#CCCCCC]" : ""}
                    `}
                    onClick={() => handleTabClick(tab.id, tab.width)}
                  >
                    {tab.label}
                    {tab.icon}
                  </div>
                );
              })}
            </div>

            {/* CONTENT */}
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
