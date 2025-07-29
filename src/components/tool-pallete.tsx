import { EventModel } from "@/dcr-related/nodes/BaseEvent";

import { ConditionModel } from "@/dcr-related/edges/Condition";
import { ExcludeModel } from "@/dcr-related/edges/Exclude";
import { IncludeModel } from "@/dcr-related/edges/Include";
import { MilestoneModel } from "@/dcr-related/edges/Milestone";
import { ResponseModel } from "@/dcr-related/edges/Response";
import { SpawnModel } from "@/dcr-related/edges/Spawn";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import { ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { NestModel } from "@/dcr-related/nodes/Nest";
import { SubprocessModel } from "@/dcr-related/nodes/Subprocess";
import { delay } from "@/lib/utils";

const selector = (state: RFState) => ({
  setEventType: state.setEventType,
  setRelationType: state.setRelationType,
  setSubgraphType: state.setSubgraphType,
});

/**
 * Relation properties to map in the tool pallete.
 */
interface RelationProps {
  component: ReactNode;
  type: string;
  selected: boolean;
}

const PALETTE_WIDTH = 300;
const PALETTE_COLLAPSED_WIDTH = 16;
const ANIMATION_DURATION = 0.2;
const CONTENT_ANIMATION_DURATION = 0.3;
const RESET_DELAY = 10;

const DRAGGABLE_ITEMS = [
  {
    component: NestModel,
    type: "nest",
    category: "subgraph",
  },
  {
    component: SubprocessModel,
    type: "subprocess",
    category: "subgraph",
  },
  {
    component: EventModel,
    type: "i",
    category: "event",
    props: { type: "i" },
  },
  {
    component: EventModel,
    type: "c",
    category: "event",
    props: { type: "c" },
  },
] as const;

const INITIAL_RELATIONS = [
  { component: <ConditionModel />, type: "condition", selected: false },
  { component: <ResponseModel />, type: "response", selected: false },
  { component: <IncludeModel />, type: "include", selected: false },
  { component: <ExcludeModel />, type: "exclude", selected: false },
  { component: <MilestoneModel />, type: "milestone", selected: false },
  { component: <SpawnModel />, type: "spawn", selected: false },
];

/**
 * ToolPallete is a React component that provides a draggable and selectable tool palette
 * for a graphical editor interface. It allows users to:
 * - Drag and drop event and subgraph types (such as events, nests, and subprocesses) onto a canvas.
 * - Select relation types (such as condition, response, include, exclude, milestone, and spawn) for further actions.
 * - Toggle the visibility of the palette for a more compact UI.
 *
 * The component manages the current drag type and selected relation type using a shared store and local state.
 * It uses Framer Motion for animated transitions and supports both drag-and-drop and click interactions.
 *
 * @component
 * @returns {JSX.Element} The rendered tool palette UI.
 */
export default function ToolPallete() {
  const { setEventType, setRelationType, setSubgraphType } = useStore(
    selector,
    shallow
  );

  const [relations, setRelations] =
    useState<RelationProps[]>(INITIAL_RELATIONS);
  const [open, setOpen] = useState(false);

  /**
   * Handles the drag start event for draggable items in the tool palette.
   * Sets the appropriate type (event or subgraph) based on the provided type string,
   * and configures the drag-and-drop effect.
   *
   * @param event - The drag event triggered when the user starts dragging an item.
   * @param type - The type identifier for the dragged item.
   * @param category - The category of the item ("event" or "subgraph").
   */
  const onDragStart = (event: any, type: string, category: string) => {
    if (category === "event") setEventType(type);
    else setSubgraphType(type);
    event.dataTransfer.effectAllowed = "move";
  };

  /**
   * Handles the drag end event by resetting the event and subgraph types after a short delay.
   * This ensures that any UI updates dependent on these states are properly triggered.
   */
  const onDragEnd = async () => {
    await delay(RESET_DELAY);
    setEventType("");
    setSubgraphType("");
  };

  /**
   * Handles relation selection, toggling the selected state and updating the store.
   * @param index - The index of the relation to select.
   */
  const handleRelationClick = (index: number) => {
    const currentRelation = relations[index];
    const newSelected = !currentRelation.selected;

    // Set or clear the relation type
    setRelationType(newSelected ? currentRelation.type : "");

    // Update relations state
    setRelations((prev) =>
      prev.map((relation, i) => ({
        ...relation,
        selected: i === index ? newSelected : false,
      }))
    );
  };

  const getRelationClasses = (selected: boolean) =>
    `${
      selected ? "bg-white" : "bg-[#CCCCCC]"
    } hover:ring-1 h-8 w-12 flex items-center justify-center rounded-sm cursor-pointer select-none`;

  const renderDraggableItems = () => {
    const subgraphItems = DRAGGABLE_ITEMS.filter(
      (item) => item.category === "subgraph"
    );
    const eventItems = DRAGGABLE_ITEMS.filter(
      (item) => item.category === "event"
    );

    return (
      <>
        {/* SUBGRAPHS */}
        <div className="flex gap-5">
          {subgraphItems.map(({ component: Component, type, category }) => (
            <Component
              key={type}
              onDragStart={(event: any) => onDragStart(event, type, category)}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>

        {/* EVENTS */}
        <div className="flex gap-5">
          {eventItems.map(({ component: Component, type, category, props }) => (
            <Component
              key={type}
              onDragStart={(event: any) => onDragStart(event, type, category)}
              onDragEnd={onDragEnd}
              {...(props || {})}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ width: PALETTE_COLLAPSED_WIDTH }}
      animate={{ width: open ? PALETTE_WIDTH : PALETTE_COLLAPSED_WIDTH }}
      exit={{ width: PALETTE_WIDTH }}
      transition={{ duration: ANIMATION_DURATION, ease: "easeInOut" }}
      className="absolute h-[50%] top-[25%] bg-[#D9D9D9] rounded-tr-lg rounded-br-lg justify-center shadow-lg flex flex-col py-10 items-center gap-10 overflow-hidden z-10"
    >
      {/* TOOL PALETTE CONTENT */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="palette-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: CONTENT_ANIMATION_DURATION }}
            className="flex flex-col gap-5 mr-5 items-center"
          >
            {/* DRAGGABLE ITEMS */}
            {renderDraggableItems()}

            {/* RELATIONS FOR SELECTION */}
            <div className="grid grid-cols-3 gap-x-5 gap-y-3">
              {relations.map((relation, index) => (
                <div
                  key={relation.type}
                  onClick={() => handleRelationClick(index)}
                  className={getRelationClasses(relation.selected)}
                >
                  {relation.component}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOOL PALETTE TOGGLE BUTTON */}
      <motion.div
        onClick={() => setOpen(!open)}
        className="absolute right-0 cursor-pointer flex items-center justify-center w-4 h-full border-l-2 border-r-2 border-b-2 rounded-br-lg border-t-2 rounded-tr-lg border-[#CCCCCC]"
      >
        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ duration: CONTENT_ANIMATION_DURATION }}
        >
          <ChevronLeft />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
