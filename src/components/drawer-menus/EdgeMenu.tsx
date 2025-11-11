import { MoveRight } from "lucide-react";
import { Edge } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";
import {
  DrawerMenu,
  DrawerMenuLabel,
  FormDocumentation,
  FormField,
  FormTextarea,
} from "@/lib/reusable-comps";

const selector = (state: RFState) => ({
  updateEdge: state.updateEdge,
  documentation: state.documentation,
  addDocumentation: state.addDocumentation,
  currentProjection: state.currentProjection,
  isGlobalProjection: state.isGlobalProjection,
});

/**
 * Drawer menu component that displays and edits properties for a given graph edge.
 *
 * @param edge - the edge object to inspect/edit of type {@link Edge `Edge`}.
 *
 * Renders:
 * - A header showing the edge id and an icon.
 * - A documentation editor ({@link FormDocumentation `FormDocumentation`}) when the global projection mode is enabled.
 * - A guarded condition editor ({@link FormTextarea `FormTextarea`}) for the edge's guard.
 *
 * Behavior:
 * - Accepts a single prop `edge` of type {@link Edge `Edge`} with at least `id` and `data` fields.
 * - Locally tracks the guard text in component state (`guard`) initialized from `edge.data.guard`.
 * - When the application is in `"global"` mode, user edits to the guard are persisted
 *   back to the global store via {@link updateEdge `updateEdge`} with a 200ms debounce. Each persisted update sets
 *   the edge's `selected` flag to `true`.
 * - Edits are not persisted when not in global projection mode; the guard textarea is disabled in that case.
 * - Documentation changes (when shown) are saved immediately via {@link addDocumentation `addDocumentation`} with the edge id and new value.
 *
 * Side effects and cleanup:
 * - A {@link useEffect `useEffect`} watches the `guard` and {@link isGlobalProjection `isGlobalProjection`} values. It:
 *   - Returns early and does nothing if {@link isGlobalProjection `isGlobalProjection`} is false.
 *   - Returns early if the current store value `data.guard` already equals the local `guard`.
 *   - Clears and resets a debounce timeout on each change, and cleans up the timeout on unmount/update.
 *
 * @remarks
 * - The component consumes store selectors via a shallow equality comparator.
 * - There is a commented-out manual save handler in the source; persistence is currently handled automatically
 *   via the debounce effect when in global projection mode.
 *
 * @component
 * @returns a JSX element representing the drawer menu UI for the edge.
 */
const EdgeMenu = ({ edge }: { edge: Edge }) => {
  const { updateEdge, documentation, addDocumentation, isGlobalProjection } =
    useStore(selector, shallow);
  const { id, data } = edge as { id: string; data: Record<string, string> };
  const [guard, setGuard] = useState(data.guard || "");

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isGlobalProjection() || data.guard === guard) return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      updateEdge(id, {
        ...edge,
        data: { ...data, guard },
        selected: true,
      });
    }, 200);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [guard, isGlobalProjection, id, data, edge]);

  return (
    <>
      {/* DRAWER EDGE MENU */}
      <DrawerMenu>
        <DrawerMenuLabel>
          <MoveRight size={40} />
          Edge {id}
        </DrawerMenuLabel>

        {/* DOCUMENTATION */}
        {isGlobalProjection() && (
          <FormDocumentation
            documentation={documentation.get(id)}
            onChange={(e) => addDocumentation(id, e.target.value)}
            key={id}
          />
        )}

        {/* FORM FIELDS */}
        <div className="flex flex-col p-3 gap-3">
          {/* GUARD */}
          <FormField label="Guard">
            <FormTextarea
              value={guard}
              onChange={(e) => setGuard(e.target.value)}
              placeholder="Guard condition"
              disabled={!isGlobalProjection()}
            />
          </FormField>
        </div>
      </DrawerMenu>
    </>
  );
};

export default EdgeMenu;
