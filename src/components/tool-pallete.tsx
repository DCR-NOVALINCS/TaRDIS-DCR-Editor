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

const PALLETE_DATA = {
  width: 300,
  collapsedWidth: 16,
  animationDuration: 0.2,
  contentAnimationDuration: 0.3,
  resetDelay: 10,
};

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
 * A collapsible, animated toolbox used to create and select DCR graph elements
 * (events, subgraphs) and relations. The palette exposes draggable items that
 * initialize global drag state (via the zustand store) and a set of relation
 * buttons that toggle the active relation type in the store.
 *
 * Behavior and responsibilities:
 * - Renders two groups of draggable items:
 *   - Subgraphs (e.g. Nest, Subprocess)
 *   - Events (e.g. input/computation events)
 *   Dragging an item calls {@link onDragStart `onDragStart`} which sets the appropriate type in the
 *   store (event or subgraph) and configures the `dataTransfer` effect. {@link onDragEnd `onDragEnd`}
 *   resets those types after a short {@link PALLETE_DATA.resetDelay `resetDelay`} to avoid leaving stale state.
 *
 * - Renders a grid of relation buttons (Condition, Response, Include, Exclude,
 *   Milestone, Spawn). Clicking a relation toggles its selected state and
 *   updates the relation type in the store. Only one relation can be selected
 *   at a time; clicking a selected relation will deselect it (clearing the
 *   relation type).
 *
 * - The palette supports open/collapsed states:
 *   - Width and content opacity are animated using framer-motion.
 *   - The toggle control on the right toggles the open state and animates the
 *     chevron icon.
 *
 * Implementation notes:
 * - Uses local component state for the palette open/collapsed state and for
 *   tracking which relation is selected (an array of {@link RelationProps `RelationProps`}).
 * - Uses a zustand store (selector: {@link setEventType `setEventType`}, {@link setRelationType `setRelationType`},
 *   {@link setSubgraphType `setSubgraphType`}) to communicate the currently dragged/selected types to the
 *   rest of the application.
 * - Constants in the module (all from {@link PALLETE_DATA `PALLETE_DATA`}) centralize sizing, timing and the
 *   available draggable and relation elements.
 * - Tooltips are provided via simple CSS/hover; draggable components are
 *   expected to accept {@link onDragStart `onDragStart`} and {@link onDragEnd `onDragEnd`} props.
 *
 * @remarks
 * - Side effects: Calls store setters to set/clear event, subgraph and relation
 *   types. The drag-and-drop flow intentionally leaves a short delay
 *   before clearing to avoid transient visual glitches.
 * - Animation: Uses framer-motion for width/opacity/rotation transitions.
 *
 * @see {@link DRAGGABLE_ITEMS `DRAGGABLE_ITEMS`} and {@link INITIAL_RELATIONS `INITIAL_RELATIONS`} constants in this module for the
 * available items and default relations configuration.
 *
 * @component
 * @returns a JSX Element with the rendered tool palette component.
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
    await delay(PALLETE_DATA.resetDelay);
    setEventType("");
    setSubgraphType("");
  };

  /**
   * Handles relation selection, toggling the selected state and updating the store.
   *
   * @param index - The index of the relation to select.
   */
  const handleRelationClick = (index: number) => {
    const currentRelation = relations[index];
    const newSelected = !currentRelation.selected;

    setRelationType(newSelected ? currentRelation.type : "");

    setRelations((prev) =>
      prev.map((relation, i) => ({
        ...relation,
        selected: i === index ? newSelected : false,
      }))
    );
  };

  /**
   * Returns the CSS classes for a relation based on its selected state.
   *
   * @param selected - whether the relation is selected.
   * @returns a string of CSS classes.
   */
  const getRelationClasses = (selected: boolean) =>
    `${
      selected ? "bg-white" : "bg-[#CCCCCC]"
    } hover:ring-1 h-8 w-12 flex items-center justify-center rounded-sm cursor-pointer select-none`;

  /**
   * Renders the draggable items (subgraphs and events) in the tool palette.
   *
   * @returns a JSX element containing the draggable items.
   */
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
            <div className="relative group" key={type}>
              <Component
                key={type}
                onDragStart={(event: any) => onDragStart(event, type, category)}
                onDragEnd={onDragEnd}
              />

              {/* TOOLTIP */}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </div>
          ))}
        </div>

        {/* EVENTS */}
        <div className="flex gap-5">
          {eventItems.map(({ component: Component, type, category, props }) => (
            <div className="relative group" key={type}>
              <Component
                key={type}
                onDragStart={(event: any) => onDragStart(event, type, category)}
                onDragEnd={onDragEnd}
                {...(props || {})}
              />

              {/* TOOLTIP */}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                {type === "i" ? "Input Event" : "Computation Event"}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      {/* TOOL PALETTE CONTAINER */}
      <motion.div
        initial={{ width: PALLETE_DATA.collapsedWidth }}
        animate={{
          width: open ? PALLETE_DATA.width : PALLETE_DATA.collapsedWidth,
        }}
        exit={{ width: PALLETE_DATA.width }}
        transition={{
          duration: PALLETE_DATA.animationDuration,
          ease: "easeInOut",
        }}
        className="absolute h-[55%] top-[25%] bg-[#D9D9D9] rounded-tr-lg rounded-br-lg justify-center shadow-lg flex flex-col py-10 items-center gap-10 overflow-hidden z-10"
      >
        {/* TOOL PALETTE CONTENT */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="palette-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: PALLETE_DATA.contentAnimationDuration }}
              className="flex flex-col gap-5 mr-5 items-center"
            >
              {/* DRAGGABLE ITEMS */ renderDraggableItems()}

              {/* RELATIONS FOR SELECTION */}
              <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                {relations.map((relation, index) => (
                  <div
                    key={relation.type}
                    onClick={() => handleRelationClick(index)}
                    className={`${getRelationClasses(
                      relation.selected
                    )} relative group`}
                  >
                    {relation.component}

                    {/* TOOLTIP */}
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      {relation.type.charAt(0).toUpperCase() +
                        relation.type.slice(1)}
                    </span>
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
            transition={{ duration: PALLETE_DATA.contentAnimationDuration }}
          >
            <ChevronLeft />
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
