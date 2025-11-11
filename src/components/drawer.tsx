import { isEdge, isNode } from "@xyflow/react";
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
  isGlobalProjection: state.isGlobalProjection,
  setSelectedElement: state.setSelectedElement,
});

const DRAWER_CLOSED_WIDTH = 16;
const DRAWER_ANIMATION_DURATION = 0.2;
const CONTENT_ANIMATION_DURATION = 0.3;
const DEFAULT_WIDTH = "25%";
const CODE_WIDTH = "50%";

type Tab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  width: string;
  isActive: (logs: boolean, code: boolean) => boolean;
};

const TABS: Tab[] = [
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
] as const;

const MAIN_TABS: Tab[] = [
  ...TABS,
  {
    id: "code",
    label: "Code",
    icon: <Code size={20} />,
    width: CODE_WIDTH,
    isActive: (logs: boolean, code: boolean) => code && !logs,
  },
];

/**
 * A right-side, animated sliding drawer used to display contextual menus and tools
 * for the editor (properties, logs, code, etc.). The component reads and updates
 * global UI state from the {@link RFState `RFState`} store (via {@link useStore `useStore`}) to determine its open/closed
 * state, active tab, and selected element.
 *
 * Key behavior:
 * - Controlled entirely via global store values:
 *   - {@link selectedElement `selectedElement`}: object(s) currently selected in the editor;
 *   - {@link drawerOpen `drawerOpen`}: whether the drawer is open;
 *   - {@link drawerSelectedLogs `drawerSelectedLogs`} / {@link drawerSelectedCode `drawerSelectedCode`}: which special tab is active;
 *   - {@link drawerWidth `drawerWidth`}: current target width for the drawer;
 *   - {@link isGlobalProjection `isGlobalProjection`}: determines available tabs (adds "Code" tab when true);
 * - Tabs:
 *   - When {@link isGlobalProjection `isGlobalProjection`} is true, {@link MAIN_TABS `MAIN_TABS`} are used (Properties, Logs, Code).
 *   - Otherwise {@link TABS `TABS`} are used (Properties, Logs).
 *   - Each tab has an id, label, icon and a target width. The currently active tab
 *     is determined via a per-tab {@link isActive `isActive`} callback (based on {@link drawerSelectedLogs `drawerSelectedLogs`} and {@link drawerSelectedCode `drawerSelectedCode`}).
 * - Tab click semantics ({@link handleTabClick `handleTabClick`}):
 *   - Clicking "properties" when neither Logs nor Code are active will clear the {@link selectedElement `selectedElement`}
 *     ({@link setSelectedElement `setSelectedElement(undefined)`}) — this is used to return to the default "properties" view.
 *   - Clicking "logs" or "code" will set {@link drawerSelectedLogs `drawerSelectedLogs`} / {@link drawerSelectedCode `drawerSelectedCode`} respectively
 *     and update {@link drawerWidth `drawerWidth`} to the tab's configured width.
 * - Content selection ({@link renderContent `renderContent`}):
 *   - If {@link drawerSelectedLogs `drawerSelectedLogs`} => render `<LogsMenu />`
 *   - Else if {@link drawerSelectedCode `drawerSelectedCode`} => render `<CodeMenu />`
 *   - Else if no {@link selectedElement `selectedElement`} => render `<ChoreographyMenu />`
 *   - Else if {@link selectedElement `selectedElement`} is a node:
 *       - if `node.type === "event"` => render `<NodeMenu node={selectedElement} />`
 *       - otherwise => render `<SubgraphMenu nest={selectedElement} />`
 *   - Else if {@link selectedElement `selectedElement`} is an edge => render `<EdgeMenu edge={selectedElement} />`
 *   - (There is a commented-out branch for multiple selected nodes which is not active)
 *
 * Animations & UI:
 * - Uses framer-motion for smooth width and opacity transitions:
 *   - The drawer animates between a closed width ({@link DRAWER_CLOSED_WIDTH `DRAWER_CLOSED_WIDTH`}) and the active {@link drawerWidth `drawerWidth`}.
 *   - Durations are controlled by {@link DRAWER_ANIMATION_DURATION `DRAWER_ANIMATION_DURATION`} and {@link CONTENT_ANIMATION_DURATION `CONTENT_ANIMATION_DURATION`} constants.
 *   - A chevron toggle rotates when opening/closing the drawer.
 * - Styling is applied via Tailwind utility classes; {@link getTabColor `getTabColor`} returns the bg color class
 *   for active vs inactive tabs.
 * - The drawer's content is wrapped with {@link AnimatePresence `AnimatePresence`} for enter/exit opacity transitions.
 *
 * Notes & side effects:
 * - The component does not accept props; it is a connected UI component that relies on the global store.
 * - Opening/closing and tab selection are persisted in the shared store enabling other parts of the app
 *   to react to drawer changes.
 *
 * @component
 * @returns a JSX Element representing the drawer component's rendered JSX.
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
    isGlobalProjection,
    setSelectedElement,
  } = useStore(selector, shallow);

  const currentTabs = isGlobalProjection() ? MAIN_TABS : TABS;

  /**
   * Handles tab click events to update the selected tab and drawer width.
   *
   * @param tabId - the ID of the clicked tab.
   * @param width - the width to set for the drawer when the tab is selected.
   */
  const handleTabClick = (tabId: string, width: string) => {
    if (tabId === "properties" && !drawerSelectedLogs && !drawerSelectedCode)
      setSelectedElement(undefined);
    else {
      const isLogs = tabId === "logs";
      const isCode = tabId === "code";

      setDrawerSelectedLogs(isLogs);
      setDrawerSelectedCode(isCode);
      setDrawerWidth(width);
    }
  };

  /**
   * Determines the background color of a tab based on its active state.
   *
   * @param isActive - boolean indicating if the tab is currently active.
   * @returns a string representing the background color class.
   */
  const getTabColor = (isActive: boolean) =>
    isActive ? "bg-[#CCCCCC]" : "bg-[#D9D9D9]";

  /**
   * Renders the content of the drawer based on the selected tab.
   *
   * @returns a JSX Element representing the content of the drawer.
   */
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
    } else if (isEdge(selectedElement))
      return <EdgeMenu key={selectedElement.id} edge={selectedElement} />;
    /* else
      return (
        <NodesMenu
          key={selectedElement[0].id}
          selectedNodes={selectedElement}
        />
      ); */
  };

  return (
    <>
      {/* DRAWER CONTAINER */}
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
                {currentTabs.map((tab, index) => {
                  const isActive = tab.isActive(
                    drawerSelectedLogs,
                    drawerSelectedCode
                  );
                  const isLastTab = index === currentTabs.length - 1;
                  return (
                    <div
                      key={tab.id}
                      className={`
                      cursor-pointer w-full p-2 justify-center flex items-center gap-2
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

              {/* CONTENT */ renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
