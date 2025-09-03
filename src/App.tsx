import { shallow } from "zustand/shallow";
import Flow from "./flows/Flow";
import useStore, { RFState } from "./stores/store";
import SimulationFlow from "./flows/SimulationFlow";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

/**
 * The main application component for the TaRDIS-DCR-Editor.
 *
 * Renders the primary layout, including the `Flow` component and, conditionally,
 * the `ToolPallete` and `Drawer` components based on the current simulation state.
 *
 * @returns {JSX.Element} The root JSX element for the application.
 */
export default function App() {
  const { simulationFlow } = useStore(selector, shallow);

  return (
    <div className="flex h-screen w-screen">
      {simulationFlow ? <SimulationFlow /> : <Flow />}
    </div>
  );
}
