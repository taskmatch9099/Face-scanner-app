import React, { useRef, useEffect } from "react";
import { Concern } from "brain/data-contracts";

interface Props {
  imageUrl: string;
  concerns: Concern[];
  selectedConcern: Concern | null;
}

const FacialLandmarkCanvas: React.FC<Props> = ({ imageUrl, concerns, selectedConcern }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      // Draw all concern bounding boxes
      if (concerns) {
        concerns.forEach(concern => {
          concern.locations.forEach(box => {
            const isSelected = selectedConcern?.name === concern.name;
            const x = box.x_min * canvas.width;
            const y = box.y_min * canvas.height;
            const width = (box.x_max - box.x_min) * canvas.width;
            const height = (box.y_max - box.y_min) * canvas.height;

            // Style based on selection
            ctx.strokeStyle = isSelected ? "rgba(255, 255, 0, 1)" : "rgba(255, 0, 0, 0.7)"; // Yellow for selected, red for others
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(x, y, width, height);

            if (isSelected) {
              // Optionally add a label for the selected concern
              ctx.fillStyle = "rgba(255, 255, 0, 1)";
              ctx.font = "16px Arial";
              ctx.fillText(concern.name, x, y - 5);
            }
          });
        });
      }
    };
  }, [imageUrl, concerns, selectedConcern]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "auto", borderRadius: "8px" }}
    />
  );
};

export default FacialLandmarkCanvas;
