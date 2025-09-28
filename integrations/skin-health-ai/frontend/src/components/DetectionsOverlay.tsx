import React, { useEffect, useRef } from "react";

export interface Detection {
  x: number; // center x in pixels of original image
  y: number; // center y in pixels of original image
  width: number; // width in pixels of original image
  height: number; // height in pixels of original image
  confidence: number; // 0..1
  class_name?: string | null;
}

interface Props {
  forImage: HTMLImageElement;
  detections: Detection[];
  imageSize: { width: number; height: number };
  mode?: "heat" | "boxes";
  opacity?: number; // used for heat
}

const DetectionsOverlay: React.FC<Props> = ({ forImage, detections, imageSize, mode = "heat", opacity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !forImage || !imageSize?.width || !imageSize?.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to displayed image box
    const rect = forImage.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Determine scaling from original pixels to displayed pixels
    const scaleX = rect.width / imageSize.width;
    const scaleY = rect.height / imageSize.height;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === "boxes") {
      // Draw semi-transparent boxes
      detections.forEach((d) => {
        const x1 = (d.x - d.width / 2) * scaleX;
        const y1 = (d.y - d.height / 2) * scaleY;
        const w = d.width * scaleX;
        const h = d.height * scaleY;
        const conf = Math.max(0.2, Math.min(1, d.confidence));
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)"; // red stroke
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, w, h);
        // Fill subtle
        ctx.fillStyle = `rgba(239, 68, 68, ${0.12 * conf})`;
        ctx.fillRect(x1, y1, w, h);
        // Label
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "12px Inter, Arial";
        ctx.fillText(`${Math.round(conf * 100)}%`, x1 + 4, y1 + 14);
      });
      return;
    }

    // Heat mode: paint soft radial gradients per detection
    detections.forEach((d) => {
      const centerX = d.x * scaleX;
      const centerY = d.y * scaleY;
      const radiusX = (d.width * scaleX) / 2;
      const radiusY = (d.height * scaleY) / 2;
      const maxR = Math.max(radiusX, radiusY) * 0.8;
      const conf = Math.max(0.2, Math.min(1, d.confidence));

      // Create radial gradient
      const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxR);
      // Strongest at center
      grd.addColorStop(0, `rgba(239, 68, 68, ${opacity * conf})`);
      grd.addColorStop(0.6, `rgba(239, 68, 68, ${opacity * conf * 0.4})`);
      grd.addColorStop(1, "rgba(239, 68, 68, 0)");

      ctx.fillStyle = grd;
      // Draw as ellipse by scaling context
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(radiusX / maxR || 1, radiusY / maxR || 1);
      ctx.beginPath();
      ctx.arc(0, 0, maxR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }, [forImage, detections, imageSize, mode, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "multiply" }}
    />
  );
};

export default DetectionsOverlay;
