import ToolPallete from "./components/tool-pallete";
import Flow from "./Flow";
import Drawer from "./components/drawer";
import useStore, { RFState } from "./stores/store";

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
  const { simulationFlow } = useStore(selector);

  return (
    <div className="flex h-screen w-screen">
      <Flow />
      {!simulationFlow && (
        <>
          <ToolPallete />
          <Drawer />
        </>
      )}
    </div>
  );
}
