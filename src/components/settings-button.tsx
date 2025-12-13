import { Modal } from "@/lib/reusable-comps";
import useStore, { RFState } from "@/stores/store";
import { BackgroundVariant, ControlButton } from "@xyflow/react";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  backgroundVariant: state.backgroundVariant,
  setBackgroundVariant: state.setBackgroundVariant,
  minimapEnabled: state.minimapEnabled,
  setMinimapEnabled: state.setMinimapEnabled,
  snapToGridEnabled: state.snapToGridEnabled,
  setSnapToGridEnabled: state.setSnapToGridEnabled,
});

const SettingsButton = () => {
  const {
    backgroundVariant,
    setBackgroundVariant,
    minimapEnabled,
    setMinimapEnabled,
    snapToGridEnabled,
    setSnapToGridEnabled,
  } = useStore(selector, shallow);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ControlButton onClick={() => setOpen(true)} title="flow settings">
        <Settings2 />
      </ControlButton>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-4 mt-10">
          <h1 className="font-bold text-lg flex items-center justify-center gap-2 absolute top-3 left-3">
            Flow Settings
            <Settings2 size={20} />
          </h1>

          <div className="flex items-center gap-18">
            <label className="flex items-center justify-start h-8 w-8">
              Background
            </label>
            <select
              value={backgroundVariant}
              onChange={(e) =>
                setBackgroundVariant(e.target.value as BackgroundVariant)
              }
              className="border-2 w-40 h-8 rounded-sm font-mono"
            >
              {Object.values(BackgroundVariant).map((variant) => (
                <option key={variant} value={variant}>
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </option>
              ))}
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex items-center  gap-18">
            <label className="flex items-center justify-start h-8 w-24">
              Minimap
            </label>
            <input
              type="checkbox"
              checked={minimapEnabled}
              onChange={(e) => setMinimapEnabled(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
          <div className="flex items-center  gap-18">
            <label className="flex items-center justify-start h-8 w-24">
              Snap To Grid
            </label>
            <input
              type="checkbox"
              checked={snapToGridEnabled}
              onChange={(e) => setSnapToGridEnabled(e.target.checked)}
              className="w-4 h-4"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsButton;
