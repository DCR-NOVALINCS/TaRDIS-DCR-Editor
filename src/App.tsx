import Flow from "./Flow";

/**
 * The main application component for the TaRDIS-DCR-Editor.
 *
 * Renders the primary layout, including the `Flow` component and, conditionally,
 * the `ToolPallete` and `Drawer` components based on the current simulation state.
 *
 * @returns {JSX.Element} The root JSX element for the application.
 */
export default function App() {
  return (
    <div className="flex h-screen w-screen">
      <Flow />
    </div>
  );
}
