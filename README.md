# Face Scanner App - Acne Detection with Heat Maps

An advanced AI-powered face scanning application that provides comprehensive acne detection, severity analysis, and heat map visualization using computer vision and facial recognition technologies.

## Features

🔍 **Facial Detection**
- Automatic face detection using OpenCV Haar cascades
- Multiple face support in single image
- Precise face region extraction
- Fallback to manual region analysis

🔴 **Advanced Acne Detection**
- Computer vision-based acne spot identification
- Skin tone adaptive detection algorithms
- Morphological filtering for accurate results

🔥 **Heat Map Visualization**
- Density-based heat map generation
- Gaussian distribution modeling
- Color-coded severity visualization

📊 **Comprehensive Analysis**
- Acne count and density calculations
- Severity level classification (Clear, Mild, Moderate, Severe, Very Severe)
- Detailed analysis reports

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/taskmatch9099/Face-scanner-app.git
cd Face-scanner-app
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

**System Requirements**: Python 3.7+ with standard scientific packages

## Demo Scripts

### Quick Test (Recommended)
```bash
python test_acne_detection.py
```
This runs a focused test of the acne detection and heat map functionality.

### Complete Face Analysis Demo
```bash
python simple_demo.py
```
Demonstrates complete face analysis pipeline with realistic skin simulation.

### Enhanced Demo with Multiple Options
```bash
# Use synthetic face
python enhanced_demo.py

# Analyze your own image  
python enhanced_demo.py --image path/to/your/face.jpg

# Create synthetic face only
python enhanced_demo.py --synthetic-only
```

## Usage

### Basic Usage
```python
from face_scanner import FaceScanner

# Initialize scanner
scanner = FaceScanner()

# Analyze image
results = scanner.analyze_face("path/to/face_image.jpg", "output_directory")

# Print results
for face in results['face_analyses']:
    print(f"Face {face['face_id']}: {face['acne_count']} spots, {face['severity']} severity")
```

### Advanced Usage
```python
from face_scanner import FaceScanner
from utils import enhance_image_quality, preprocess_for_acne_detection

# Initialize with custom parameters
scanner = FaceScanner()
scanner.acne_threshold = 40  # Adjust sensitivity
scanner.heat_map_intensity = 0.8  # Adjust heat map opacity

# Load and preprocess image
image = scanner.load_image("face_image.jpg")
enhanced_image = enhance_image_quality(image, brightness=1.1, contrast=1.3)

# Perform analysis
results = scanner.analyze_face("face_image.jpg", "custom_output")
```

## Output Files

The application generates several types of output files:

### Analysis Visualizations
- `face_analysis_X.png`: Complete 6-panel analysis view showing:
  - Original image with face detection
  - Extracted face region
  - Acne detection overlay
  - Acne mask visualization
  - Heat map visualization
  - Combined face with heat map overlay

### Heat Map Overlays
- `heat_map_X.png`: Individual heat map overlays for each detected face

## Technical Details

### Acne Detection Algorithm
1. **Skin Segmentation**: Multi-color space skin detection (HSV + YCrCb)
2. **Texture Analysis**: Adaptive thresholding on grayscale conversion
3. **Morphological Filtering**: Noise reduction and spot refinement
4. **Contour Analysis**: Size-based filtering for acne spot validation

### Heat Map Generation
- **Gaussian Distribution**: Each acne spot generates a Gaussian heat signature
- **Density Mapping**: Overlapping distributions create density visualization
- **Normalization**: Heat map values normalized to 0-1 range for consistent visualization

### Severity Classification
- **Clear**: < 20% severity score
- **Mild**: 20-40% severity score  
- **Moderate**: 40-60% severity score
- **Severe**: 60-80% severity score
- **Very Severe**: > 80% severity score

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff)
- WebP (.webp)

## Requirements

- Python 3.7+
- OpenCV 4.8+
- NumPy 1.24+
- Matplotlib 3.7+
- Pillow 10.0+
- SciPy 1.11+

## Performance Notes

- **Processing Time**: Typically 2-10 seconds per face depending on image size
- **Memory Usage**: ~200-500MB for standard images
- **Accuracy**: Best results with well-lit, front-facing portraits
- **Image Size**: Automatically resized if larger than 1200px (maintains aspect ratio)

## Limitations

- Works best with front-facing portraits
- Requires adequate lighting for accurate detection
- May have reduced accuracy on very dark or very light skin tones
- Performance decreases with low-resolution images

## API Reference

### FaceScanner Class

#### Methods
- `load_image(image_path)`: Load image from file
- `detect_faces(image)`: Detect faces in image
- `detect_acne(face_region)`: Detect acne in face region
- `create_heat_map(face_region, acne_points)`: Generate heat map
- `analyze_face(image_path, output_dir)`: Complete analysis pipeline

#### Parameters
- `acne_threshold`: Sensitivity threshold for acne detection (default: 50)
- `heat_map_intensity`: Heat map overlay intensity (default: 0.7)

### Utility Functions

- `enhance_image_quality()`: Improve image quality
- `preprocess_for_acne_detection()`: Optimize image for acne detection
- `create_skin_mask()`: Generate skin region mask
- `calculate_acne_severity_score()`: Compute severity metrics
- `validate_image_path()`: Validate image file
- `resize_image_if_needed()`: Smart image resizing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`) 
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenCV community for computer vision tools
- face_recognition library by Adam Geitgey
- Scientific Python ecosystem (NumPy, SciPy, Matplotlib) 
