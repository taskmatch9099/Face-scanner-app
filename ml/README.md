# Skin Analyzer (High-Fidelity)

A high-fidelity skin analysis pipeline:

- Preprocessing: EXIF orientation, gray-world WB, Lab-CLAHE (2.0, 8x8), adaptive gamma
- QA gating: blur, brightness uniformity, exposure; one retry with auto-normalization
- Landmarking: MediaPipe Face Mesh polygons (forehead, cheeks, nose, chin) + skin mask
- Detection/Segmentation: YOLOv8-seg ONNX with flip TTA + NMS; optional U-Net/DeepLab
- Fusion: redness (rg-chroma/HSV), oiliness (specular proxy), pores (DoG+LBP); fused with detections into heatmaps
- Calibration: temperature/Platt scaling hooks; isotonic mapping for severity
- Guided capture: multi-frame best-of; user prompts for blur/lighting
- Fairness: per-skin-tone normalization by median intensity bucket
- Output: JSON with per-zone severity and saved heatmaps
- CLI: `python -m ml.skin_analyzer --input img.jpg --model yolov8-seg.onnx --out ./results/`

## Quickstart

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r ml/requirements.txt

# Run without model (no detections; still produces QA + redness heatmap)
python -m ml.skin_analyzer --input /path/to/face.jpg --out ./results/

# With YOLOv8-seg ONNX model (recommended)
python -m ml.skin_analyzer --input /path/to/face.jpg --model /path/to/yolov8-seg.onnx --out ./results/
```

Notes
- ONNX export node names/shapes vary. Adjust `_postprocess_yolov8_seg` if needed to match your export.
- For perfect per-zone aggregation, pass original image size with the heat grid to sample polygons exactly; current code uses a conservative approximation and is structured to upgrade easily.
- For production, load real calibration files (temperature scaling; isotonic regression) and trained segmentation weights for pores/dark spots if available.
