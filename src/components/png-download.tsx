import useStore, { RFState } from "@/stores/store";
import { shallow } from "zustand/shallow";

import { getNodesBounds, getViewportForBounds } from "@xyflow/react";

import { toPng } from "html-to-image";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
});

/**
 * This component is used to download the current state of the graph as a PNG image.
 * @returns A button that downloads the graph as a PNG image when clicked.
 */
export default function PngDownload() {
  const { nodes } = useStore(selector, shallow);

  const WIDTH = 1920;
  const HEIGHT = 1080;

  /**
   * This function is used to download the image as a PNG file.
   * @param dataUrl The data URL of the image to be downloaded.
   */
  function downloadImage(dataUrl: any) {
    const a = document.createElement("a");

    a.setAttribute("download", "reactflow.png");
    a.setAttribute("href", dataUrl);
    a.click();
  }

  /**
   * This function is called when the button is clicked. It gets the bounds of the nodes,
   */
  const onClick = () => {
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      WIDTH,
      HEIGHT,
      0.5,
      1,
      0
    );

    const element = document.querySelector(".react-flow__viewport");
    if (element) {
      toPng(element as HTMLElement, {
        backgroundColor: "#FFFFFF",
        width: WIDTH,
        height: HEIGHT,
        style: {
          width: String(WIDTH),
          height: String(HEIGHT),
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      }).then(downloadImage);
    }
  };

  return (
    <>
      {/* PNG DOWNLOAD BUTTON */}
      <button
        className="bg-black text-white font-semibold px-2 py-1 w-36 rounded-sm m-2 hover:opacity-75 cursor-pointer"
        onClick={onClick}
      >
        Download PNG
      </button>
    </>
  );
}
