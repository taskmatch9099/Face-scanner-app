import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Download, Grid } from "lucide-react";
import { analyzeFaceForSkinAnalysis } from "utils/faceDetection";

// Keep a lightweight Detection type compatible with existing overlay
export interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class_name?: string | null;
}

interface RegionScores {
  forehead?: number;
  leftCheek?: number;
  rightCheek?: number;
  nose?: number;
  chin?: number;
}

interface Props {
  imageEl: HTMLImageElement | null;
  detections?: Detection[];
  imageSize?: { width: number; height: number } | null;
  regionScores?: RegionScores | null;
  // Optional global metrics for fallbacks
  rednessPct?: number | null; // 0-100
  oilinessPct?: number | null; // 0-100
  drynessPct?: number | null; // 0-100
  poresPct?: number | null; // 0-100
  darkSpotsPct?: number | null; // 0-100
}

// Simple cache keyed by image src to avoid recomputation
const cache = new Map<string, {
  faceBox?: { x: number; y: number; width: number; height: number };
  regions?: RegionBoxes;
  rednessGrid?: HeatGrid;
  pigmentGrid?: HeatGrid;
}>();

// Grid resolution for heatmaps (balance detail/perf)
const GRID_W = 64;
const GRID_H = 64;

type HeatGrid = {
  width: number;
  height: number;
  grid: number[][]; // [y][x] 0..1
}

type Box = { x: number; y: number; width: number; height: number };

type RegionBoxes = {
  forehead: Box;
  leftCheek: Box;
  rightCheek: Box;
  nose: Box;
  chin: Box;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const HeatmapGallery: React.FC<Props> = ({
  imageEl,
  detections = [],
  imageSize,
  regionScores,
  rednessPct = null,
  oilinessPct = null,
  drynessPct = null,
  poresPct = null,
  darkSpotsPct = null,
}) => {
  const [tab, setTab] = useState<"acne" | "redness" | "pigmentation" | "oiliness">("acne");
  const [opacityByTab, setOpacityByTab] = useState<Record<string, number>>({
    acne: 0.6,
    redness: 0.6,
    pigmentation: 0.6,
    oiliness: 0.5,
  });
  const [acneMode, setAcneMode] = useState<"heat" | "boxes">("heat");

  const acneCanvasRef = useRef<HTMLCanvasElement>(null);
  const redCanvasRef = useRef<HTMLCanvasElement>(null);
  const pigCanvasRef = useRef<HTMLCanvasElement>(null);
  const oilCanvasRef = useRef<HTMLCanvasElement>(null);

  const imageKey = useMemo(() => {
    if (!imageEl) return null;
    const naturalW = (imageEl as HTMLImageElement).naturalWidth || imageEl.width;
    const naturalH = (imageEl as HTMLImageElement).naturalHeight || imageEl.height;
    return `${imageEl.src}|${naturalW}x${naturalH}`;
  }, [imageEl]);

  const displayedRect = useMemo(() => {
    if (!imageEl) return null;
    return imageEl.getBoundingClientRect();
  }, [imageEl]);

  // Helpers to set canvas size to match displayed image size
  const sizeCanvasToImage = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !imageEl) return false;
    const rect = imageEl.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
    return true;
  }, [imageEl]);

  // Compute or load from cache: face regions and heat grids
  const ensureAnalysisCached = useCallback(async () => {
    if (!imageEl || !imageKey) return;
    if (cache.has(imageKey)) return; // Already computed

    try {
      const face = await analyzeFaceForSkinAnalysis(imageEl);
      let faceBox: Box | undefined;
      if (face.boundingBox) {
        // boundingBox from mediapipe is in pixels already for the element; convert to normalized
        // However FaceLandmarker returns normalized landmarks; boundingBox in our utils seems pixel-based relative to element
        // We will normalize to [0..1] using natural size for consistency
        const natW = (imageEl as HTMLImageElement).naturalWidth || imageEl.width;
        const natH = (imageEl as HTMLImageElement).naturalHeight || imageEl.height;
        faceBox = {
          x: face.boundingBox.x / natW,
          y: face.boundingBox.y / natH,
          width: face.boundingBox.width / natW,
          height: face.boundingBox.height / natH,
        };
      }

      const regions = estimateRegions(face.skinRegions, faceBox);

      // Build redness & pigmentation heat grids
      const rednessGrid = computeRednessGrid(imageEl, regions);
      const pigmentGrid = computePigmentationGrid(imageEl, regions);

      cache.set(imageKey, { faceBox, regions, rednessGrid, pigmentGrid });
    } catch (e) {
      // Degrade gracefully with generic regions
      const regions = estimateRegions(undefined, undefined);
      const rednessGrid = computeRednessGrid(imageEl, regions);
      const pigmentGrid = computePigmentationGrid(imageEl, regions);
      cache.set(imageKey, { regions, rednessGrid, pigmentGrid });
      console.warn("Face landmarks unavailable, using fallback regions");
    }
  }, [imageEl, imageKey]);

  // Redraw all canvases on resize/tab/opacity changes
  useEffect(() => {
    const redraw = async () => {
      if (!imageEl || !imageKey) return;
      await ensureAnalysisCached();
      const cached = cache.get(imageKey);
      const regions = cached?.regions;
      if (!regions) return;

      if (tab === "acne") {
        drawAcne(acneCanvasRef.current, imageEl, detections, acneMode, opacityByTab.acne);
      }
      if (tab === "redness") {
        drawHeatGrid(redCanvasRef.current, imageEl, cached?.rednessGrid, opacityByTab.redness, "red");
      }
      if (tab === "pigmentation") {
        drawHeatGrid(pigCanvasRef.current, imageEl, cached?.pigmentGrid, opacityByTab.pigmentation, "purple");
      }
      if (tab === "oiliness") {
        drawOiliness(oilCanvasRef.current, imageEl, regions, regionScores, {
          oilinessPct: oilinessPct ?? undefined,
          drynessPct: drynessPct ?? undefined,
          poresPct: poresPct ?? undefined,
        }, opacityByTab.oiliness);
      }
    };

    redraw();
    // Also re-render on window resize
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imageEl, imageKey, tab, acneMode, opacityByTab, detections, regionScores, oilinessPct, drynessPct, poresPct, ensureAnalysisCached]);

  const setOpacity = (key: string, v: number) => setOpacityByTab((s) => ({ ...s, [key]: v }));

  const handleDownload = (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid className="h-5 w-5" /> Concern Overlays
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!imageEl ? (
          <div className="text-sm text-neutral-600">Upload or capture an image to view overlays.</div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="acne">Acne</TabsTrigger>
              <TabsTrigger value="redness">Redness</TabsTrigger>
              <TabsTrigger value="pigmentation">Pigmentation</TabsTrigger>
              <TabsTrigger value="oiliness">Oiliness/Dryness/Pores</TabsTrigger>
            </TabsList>

            {/* Acne */}
            <TabsContent value="acne" className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={acneMode === "heat" ? "default" : "outline"} onClick={() => setAcneMode("heat")}>Heat</Button>
                  <Button size="sm" variant={acneMode === "boxes" ? "default" : "outline"} onClick={() => setAcneMode("boxes")}>Boxes</Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600">Opacity</span>
                  <Slider className="w-40" value={[opacityByTab.acne]} min={0.1} max={1} step={0.05} onValueChange={(v) => setOpacity("acne", v[0])} />
                  <Button variant="outline" size="sm" onClick={() => handleDownload(acneCanvasRef.current, "acne-overlay.png")}>
                    <Download className="h-4 w-4 mr-1" /> Download PNG
                  </Button>
                </div>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border bg-white">
                <canvas ref={acneCanvasRef} className="w-full h-auto block" />
              </div>
            </TabsContent>

            {/* Redness */}
            <TabsContent value="redness" className="mt-4 space-y-3">
              <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-neutral-600">Opacity</span>
                <Slider className="w-40" value={[opacityByTab.redness]} min={0.1} max={1} step={0.05} onValueChange={(v) => setOpacity("redness", v[0])} />
                <Button variant="outline" size="sm" onClick={() => handleDownload(redCanvasRef.current, "redness-overlay.png")}>
                  <Download className="h-4 w-4 mr-1" /> Download PNG
                </Button>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border bg-white">
                <canvas ref={redCanvasRef} className="w-full h-auto block" />
              </div>
            </TabsContent>

            {/* Pigmentation */}
            <TabsContent value="pigmentation" className="mt-4 space-y-3">
              <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-neutral-600">Opacity</span>
                <Slider className="w-40" value={[opacityByTab.pigmentation]} min={0.1} max={1} step={0.05} onValueChange={(v) => setOpacity("pigmentation", v[0])} />
                <Button variant="outline" size="sm" onClick={() => handleDownload(pigCanvasRef.current, "pigmentation-overlay.png")}>
                  <Download className="h-4 w-4 mr-1" /> Download PNG
                </Button>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border bg-white">
                <canvas ref={pigCanvasRef} className="w-full h-auto block" />
              </div>
            </TabsContent>

            {/* Oiliness/Dryness/Pores */}
            <TabsContent value="oiliness" className="mt-4 space-y-3">
              <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-neutral-600">Opacity</span>
                <Slider className="w-40" value={[opacityByTab.oiliness]} min={0.1} max={1} step={0.05} onValueChange={(v) => setOpacity("oiliness", v[0])} />
                <Button variant="outline" size="sm" onClick={() => handleDownload(oilCanvasRef.current, "regions-overlay.png")}>
                  <Download className="h-4 w-4 mr-1" /> Download PNG
                </Button>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border bg-white">
                <canvas ref={oilCanvasRef} className="w-full h-auto block" />
              </div>
              <Separator className="my-2" />
              <div className="text-xs text-neutral-600">
                Tint is region-weighted. If regional scores are unavailable, we estimate typical T-zone distribution based on overall oiliness/dryness/pores.
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );

  // ==== Drawing helpers ====

  function drawBase(canvas: HTMLCanvasElement | null, img: HTMLImageElement): CanvasRenderingContext2D | null {
    if (!canvas) return null;
    if (!sizeCanvasToImage(canvas)) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const rect = img.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    // Draw image to canvas (respect device pixel ratio)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, rect.width * pixelRatio, rect.height * pixelRatio);
    return ctx;
  }

  function drawAcne(canvas: HTMLCanvasElement | null, img: HTMLImageElement, dets: Detection[], mode: "heat" | "boxes", opacity: number) {
    const ctx = drawBase(canvas, img);
    if (!ctx || !canvas) return;
    const rect = img.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const scaleX = (rect.width * pixelRatio) / (imageSize?.width || img.naturalWidth || rect.width);
    const scaleY = (rect.height * pixelRatio) / (imageSize?.height || img.naturalHeight || rect.height);

    if (mode === "boxes") {
      dets.forEach((d) => {
        const x1 = (d.x - d.width / 2) * scaleX;
        const y1 = (d.y - d.height / 2) * scaleY;
        const w = d.width * scaleX;
        const h = d.height * scaleY;
        const conf = clamp01(d.confidence);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
        ctx.lineWidth = 2 * pixelRatio;
        ctx.strokeRect(x1, y1, w, h);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.12 * conf})`;
        ctx.fillRect(x1, y1, w, h);
        ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
        ctx.font = `${12 * pixelRatio}px Inter, Arial`;
        ctx.fillText(`${Math.round(conf * 100)}%`, x1 + 4 * pixelRatio, y1 + 14 * pixelRatio);
      });
      return;
    }

    // Heat mode: soft ellipse gradient per detection
    dets.forEach((d) => {
      const centerX = d.x * scaleX;
      const centerY = d.y * scaleY;
      const radiusX = (d.width * scaleX) / 2;
      const radiusY = (d.height * scaleY) / 2;
      const maxR = Math.max(radiusX, radiusY) * 0.8;
      const conf = Math.max(0.2, Math.min(1, d.confidence));

      const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxR);
      grd.addColorStop(0, `rgba(239, 68, 68, ${opacity * conf})`);
      grd.addColorStop(0.6, `rgba(239, 68, 68, ${opacity * conf * 0.4})`);
      grd.addColorStop(1, "rgba(239, 68, 68, 0)");

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(radiusX / maxR || 1, radiusY / maxR || 1);
      ctx.fillStyle = grd as any;
      ctx.beginPath();
      ctx.arc(0, 0, maxR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawHeatGrid(canvas: HTMLCanvasElement | null, img: HTMLImageElement, heat: HeatGrid | undefined, opacity: number, palette: "red" | "purple") {
    const ctx = drawBase(canvas, img);
    if (!ctx || !canvas || !heat) return;
    const rect = img.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    const cellW = (rect.width * pixelRatio) / heat.width;
    const cellH = (rect.height * pixelRatio) / heat.height;

    for (let y = 0; y < heat.height; y++) {
      for (let x = 0; x < heat.width; x++) {
        const intensity = heat.grid[y][x];
        if (intensity <= 0.05) continue;
        const a = Math.min(opacity, intensity);
        let r = 0, g = 0, b = 0;
        if (palette === "red") {
          r = Math.floor(255 * intensity);
          g = Math.floor(200 * (1 - intensity));
          b = 0;
        } else {
          r = Math.floor(160 * intensity);
          g = 0;
          b = Math.floor(200 * intensity);
        }
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  function drawOiliness(
    canvas: HTMLCanvasElement | null,
    img: HTMLImageElement,
    regions: RegionBoxes,
    scores: RegionScores | null | undefined,
    global: { oilinessPct?: number; drynessPct?: number; poresPct?: number },
    opacity: number,
  ) {
    const ctx = drawBase(canvas, img);
    if (!ctx || !canvas) return;
    const rect = img.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    // Determine per-region weights
    const weights: Required<RegionScores> = {
      forehead: scores?.forehead ?? clamp01((global.oilinessPct ?? 50) / 100 * 1.0),
      leftCheek: scores?.leftCheek ?? clamp01((global.drynessPct ?? 40) / 100 * 0.7),
      rightCheek: scores?.rightCheek ?? clamp01((global.drynessPct ?? 40) / 100 * 0.7),
      nose: scores?.nose ?? clamp01((global.oilinessPct ?? 50) / 100 * 1.2),
      chin: scores?.chin ?? clamp01((global.poresPct ?? 40) / 100 * 0.9),
    } as any;

    // Helper to draw rounded region with tint
    const drawRegion = (box: Box, color: string, weight: number) => {
      const x = box.x * rect.width * pixelRatio;
      const y = box.y * rect.height * pixelRatio;
      const w = box.width * rect.width * pixelRatio;
      const h = box.height * rect.height * pixelRatio;
      const radius = Math.min(w, h) * 0.2;

      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, x, y, w, h, radius);
      ctx.clip();
      ctx.fillStyle = withAlpha(color, opacity * clamp01(weight));
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    };

    // Colors: oiliness=amber, dryness=blue, pores=magenta (mixed subtly)
    drawRegion(regions.forehead, "rgba(245, 158, 11, 1)", weights.forehead);
    drawRegion(regions.nose, "rgba(245, 158, 11, 1)", weights.nose);
    drawRegion(regions.chin, "rgba(245, 158, 11, 1)", weights.chin);
    drawRegion(regions.leftCheek, "rgba(59, 130, 246, 1)", weights.leftCheek);
    drawRegion(regions.rightCheek, "rgba(59, 130, 246, 1)", weights.rightCheek);

    // subtle pores tint across cheeks/nose if pores high
    const pores = clamp01((global.poresPct ?? 40) / 100);
    if (pores > 0.4) {
      const magenta = withAlpha("rgba(219, 39, 119, 1)", opacity * (pores - 0.2));
      [regions.leftCheek, regions.rightCheek, regions.nose].forEach((box) => {
        const x = box.x * rect.width * pixelRatio;
        const y = box.y * rect.height * pixelRatio;
        const w = box.width * rect.width * pixelRatio;
        const h = box.height * rect.height * pixelRatio;
        const radius = Math.min(w, h) * 0.2;
        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, x, y, w, h, radius);
        ctx.clip();
        ctx.fillStyle = magenta as any;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      });
    }
  }
};

export default HeatmapGallery;

// ===== Pure helpers (outside component) =====

function withAlpha(rgba: string, a: number) {
  // input like rgba(r,g,b,1)
  return rgba.replace(/rgba\(([^)]+),(\s*[^,]+)\)/, (_m, rgb) => `rgba(${rgb}, ${a})`);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function estimateRegions(
  skinRegions?: {
    forehead: Box; leftCheek: Box; rightCheek: Box; nose: Box; chin: Box;
  },
  faceBox?: Box
): RegionBoxes {
  if (skinRegions) return skinRegions;

  // Generic fallback based on face box or entire image
  const fb: Box = faceBox ?? { x: 0.2, y: 0.1, width: 0.6, height: 0.8 };
  const fx = fb.x, fy = fb.y, fw = fb.width, fh = fb.height;

  const forehead: Box = { x: fx + fw * 0.05, y: fy + fh * 0.02, width: fw * 0.9, height: fh * 0.22 };
  const leftCheek: Box = { x: fx + fw * 0.05, y: fy + fh * 0.38, width: fw * 0.35, height: fh * 0.28 };
  const rightCheek: Box = { x: fx + fw * 0.60, y: fy + fh * 0.38, width: fw * 0.35, height: fh * 0.28 };
  const nose: Box = { x: fx + fw * 0.42, y: fy + fh * 0.30, width: fw * 0.16, height: fh * 0.28 };
  const chin: Box = { x: fx + fw * 0.25, y: fy + fh * 0.70, width: fw * 0.5, height: fh * 0.20 };

  return { forehead, leftCheek, rightCheek, nose, chin };
}

function computeRednessGrid(img: HTMLImageElement, regions: RegionBoxes): HeatGrid {
  const off = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Build mask of face regions (forehead, cheeks, nose, chin)
  const mask = regionMask(regions, w, h);

  const gridW = GRID_W;
  const gridH = GRID_H;
  const grid: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      // Average over cell
      const x0 = Math.floor((gx / gridW) * w);
      const y0 = Math.floor((gy / gridH) * h);
      const x1 = Math.min(w, Math.floor(((gx + 1) / gridW) * w));
      const y1 = Math.min(h, Math.floor(((gy + 1) / gridH) * h));
      let sum = 0, count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!mask[y * w + x]) continue;
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const { h: hh, s, v } = rgb2hsv(r, g, b);
          // redness heuristic: hue near 0 or > 350, saturation high, value moderate
          const hueScore = Math.max(0, 1 - Math.min(Math.abs(hh), Math.abs(360 - hh)) / 40); // within ~40 degrees of red
          const sScore = s;
          const vScore = clamp01(1 - Math.abs(v - 0.7) / 0.7);
          const intensity = clamp01(hueScore * 0.6 + sScore * 0.3 + vScore * 0.1);
          sum += intensity;
          count++;
        }
      }
      grid[gy][gx] = count > 0 ? sum / count : 0;
    }
  }

  // light smooth (3x3)
  smoothGrid(grid);
  return { width: gridW, height: gridH, grid };
}

function computePigmentationGrid(img: HTMLImageElement, regions: RegionBoxes): HeatGrid {
  const off = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const mask = regionMask(regions, w, h);

  const gridW = GRID_W;
  const gridH = GRID_H;
  const grid: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const x0 = Math.floor((gx / gridW) * w);
      const y0 = Math.floor((gy / gridH) * h);
      const x1 = Math.min(w, Math.floor(((gx + 1) / gridW) * w));
      const y1 = Math.min(h, Math.floor(((gy + 1) / gridH) * h));
      let sum = 0, count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!mask[y * w + x]) continue;
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // luminance
          const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const intensity = clamp01((0.6 - L) * 1.2); // darker than ~0.6 -> spots
          sum += intensity;
          count++;
        }
      }
      grid[gy][gx] = count > 0 ? sum / count : 0;
    }
  }

  smoothGrid(grid);
  return { width: gridW, height: gridH, grid };
}

function smoothGrid(grid: number[][]) {
  const h = grid.length;
  const w = grid[0].length;
  const copy = grid.map(row => row.slice());
  const kernel = [
    [0.05, 0.1, 0.05],
    [0.1, 0.4, 0.1],
    [0.05, 0.1, 0.05],
  ];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          acc += copy[y + ky][x + kx] * kernel[ky + 1][kx + 1];
        }
      }
      grid[y][x] = acc;
    }
  }
}

function regionMask(regions: RegionBoxes, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const boxes = [regions.forehead, regions.leftCheek, regions.rightCheek, regions.nose, regions.chin];
  for (const b of boxes) {
    const x0 = Math.floor(b.x * w);
    const y0 = Math.floor(b.y * h);
    const x1 = Math.min(w, Math.floor((b.x + b.width) * w));
    const y1 = Math.min(h, Math.floor((b.y + b.height) * h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        mask[y * w + x] = 1;
      }
    }
  }
  return mask;
}

function rgb2hsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}
