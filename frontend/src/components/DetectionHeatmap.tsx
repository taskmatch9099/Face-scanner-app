import React, { useEffect, useRef } from 'react';

interface Props {
  forImage: HTMLImageElement;
  heat: {
    grid: number[][];
    width: number;
    height: number;
  };
  opacity?: number;
}

const DetectionHeatmap: React.FC<Props> = ({ forImage, heat, opacity = 0.65 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !forImage || !heat) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    const rect = forImage.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw heat map
    const cellWidth = canvas.width / heat.width;
    const cellHeight = canvas.height / heat.height;

    for (let y = 0; y < heat.height; y++) {
      for (let x = 0; x < heat.width; x++) {
        const intensity = heat.grid[y][x];
        if (intensity > 0.1) { // Only show significant values
          const alpha = Math.min(opacity, intensity);
          const red = Math.floor(255 * intensity);
          const green = Math.floor(255 * (1 - intensity));
          
          ctx.fillStyle = `rgba(${red}, ${green}, 0, ${alpha})`;
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
      }
    }
  }, [forImage, heat, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
    />
  );
};

export default DetectionHeatmap;
