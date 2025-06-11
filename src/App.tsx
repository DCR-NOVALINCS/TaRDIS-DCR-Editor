import ToolPallete from "./components/tool-pallete";
import Flow from "./Flow";
import Drawer from "./components/drawer";
import useStore, { RFState } from "./stores/store";

const selector = (state: RFState) => ({
  simulationFlow: state.simulationFlow,
});

/**
 * The main application component.
 * This component serves as the entry point for the application.
 * @returns The main application component.
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
