#!/usr/bin/env python3
"""
Enhanced Face Scanner Demo
==========================

This script demonstrates the complete face scanner functionality including:
1. Face detection using OpenCV
2. Acne detection with computer vision
3. Heat map generation and visualization
4. Comprehensive analysis and reporting

Works with both synthetic and real face images.
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from face_scanner import FaceScanner
import os
import argparse


def create_enhanced_synthetic_face():
    """Create a more realistic synthetic face that can be detected by OpenCV."""
    
    # Create larger image for better face detection
    height, width = 800, 600
    
    # Create background
    img = np.ones((height, width, 3), dtype=np.uint8) * 240
    
    # Create face oval
    center_x, center_y = width // 2, height // 2
    face_width, face_height = 200, 260
    
    # Draw face shape
    cv2.ellipse(img, (center_x, center_y), (face_width, face_height), 0, 0, 360, (220, 190, 160), -1)
    
    # Add facial features for better detection
    # Eyes
    eye_y = center_y - 60
    cv2.ellipse(img, (center_x - 60, eye_y), (30, 20), 0, 0, 360, (255, 255, 255), -1)  # Eye whites
    cv2.ellipse(img, (center_x + 60, eye_y), (30, 20), 0, 0, 360, (255, 255, 255), -1)
    cv2.circle(img, (center_x - 60, eye_y), 12, (100, 50, 20), -1)  # Iris
    cv2.circle(img, (center_x + 60, eye_y), 12, (100, 50, 20), -1)
    cv2.circle(img, (center_x - 60, eye_y), 6, (0, 0, 0), -1)      # Pupils
    cv2.circle(img, (center_x + 60, eye_y), 6, (0, 0, 0), -1)
    
    # Eyebrows
    cv2.ellipse(img, (center_x - 60, eye_y - 40), (40, 12), 0, 0, 360, (80, 60, 40), -1)
    cv2.ellipse(img, (center_x + 60, eye_y - 40), (40, 12), 0, 0, 360, (80, 60, 40), -1)
    
    # Nose
    nose_y = center_y
    cv2.ellipse(img, (center_x, nose_y), (15, 30), 0, 0, 360, (200, 170, 140), -1)
    cv2.ellipse(img, (center_x - 10, nose_y + 20), (5, 8), 0, 0, 360, (180, 150, 120), -1)
    cv2.ellipse(img, (center_x + 10, nose_y + 20), (5, 8), 0, 0, 360, (180, 150, 120), -1)
    
    # Mouth
    mouth_y = center_y + 80
    cv2.ellipse(img, (center_x, mouth_y), (40, 15), 0, 0, 360, (180, 120, 120), -1)
    
    # Add hair
    cv2.ellipse(img, (center_x, center_y - 180), (180, 120), 0, 0, 360, (60, 40, 20), -1)
    
    # Add neck
    cv2.rectangle(img, (center_x - 50, center_y + face_height), 
                  (center_x + 50, height), (210, 180, 150), -1)
    
    # Add acne spots in realistic locations
    np.random.seed(42)
    acne_areas = [
        # Forehead
        (center_x, center_y - 100, 80, 40),
        # Cheeks
        (center_x - 80, center_y, 40, 60),
        (center_x + 80, center_y, 40, 60),
        # Chin
        (center_x, center_y + 120, 60, 30)
    ]
    
    total_spots = 0
    for area_x, area_y, area_w, area_h in acne_areas:
        spots_in_area = np.random.randint(2, 6)
        for _ in range(spots_in_area):
            x = np.random.randint(area_x - area_w//2, area_x + area_w//2)
            y = np.random.randint(area_y - area_h//2, area_y + area_h//2)
            
            # Check if within face bounds
            if (x - center_x)**2 / face_width**2 + (y - center_y)**2 / face_height**2 <= 1:
                radius = np.random.randint(2, 6)
                intensity = np.random.randint(40, 80)
                
                # Get base color and create reddish spot
                base_color = img[y, x]
                color = (
                    max(0, int(base_color[0]) - intensity//3),  # Reduce blue
                    max(0, int(base_color[1]) - intensity//2),  # Reduce green
                    max(0, int(base_color[2]) - intensity)      # Reduce red most
                )
                
                cv2.circle(img, (x, y), radius, color, -1)
                total_spots += 1
    
    # Add some texture noise
    noise = np.random.randint(-10, 10, (height, width, 3))
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Save the image
    cv2.imwrite("enhanced_face.jpg", img)
    print(f"Created enhanced synthetic face with {total_spots} acne spots")
    
    return "enhanced_face.jpg", total_spots


def run_complete_analysis(image_path, output_dir="analysis_output"):
    """Run complete face analysis with enhanced visualization."""
    
    print("Enhanced Face Scanner - Complete Analysis")
    print("=" * 50)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize scanner
    scanner = FaceScanner()
    
    # Load image
    image = scanner.load_image(image_path)
    if image is None:
        print(f"Error: Could not load image {image_path}")
        return None
    
    print(f"Loaded image: {image.shape[1]}x{image.shape[0]} pixels")
    
    # Detect faces
    face_locations = scanner.detect_faces(image)
    print(f"Faces detected: {len(face_locations)}")
    
    if not face_locations:
        print("No faces detected. Creating manual analysis of center region...")
        # Use center portion as face region for analysis
        h, w = image.shape[:2]
        face_locations = [(h//4, 3*w//4, 3*h//4, w//4)]  # (top, right, bottom, left)
    
    all_results = []
    
    for i, (top, right, bottom, left) in enumerate(face_locations):
        print(f"\nAnalyzing face {i+1}...")
        
        # Extract face region
        face_region = image[top:bottom, left:right]
        face_height, face_width = face_region.shape[:2]
        print(f"Face region: {face_width}x{face_height} pixels")
        
        # Analyze acne
        acne_mask, acne_points = scanner.detect_acne(face_region)
        print(f"Acne spots detected: {len(acne_points)}")
        
        # Generate heat map
        heat_map = scanner.create_heat_map(face_region, acne_points)
        
        # Calculate metrics
        face_area = face_width * face_height
        density = len(acne_points) / (face_area / 10000)
        
        # Classify severity
        if density < 0.5:
            severity = "Clear"
            severity_color = "green"
        elif density < 1.5:
            severity = "Mild"
            severity_color = "yellow"
        elif density < 3.0:
            severity = "Moderate"
            severity_color = "orange"
        else:
            severity = "Severe"
            severity_color = "red"
        
        # Store results
        result = {
            'face_id': i + 1,
            'bbox': (top, right, bottom, left),
            'spots_count': len(acne_points),
            'density': density,
            'severity': severity,
            'severity_color': severity_color,
            'face_size': (face_width, face_height)
        }
        all_results.append(result)
        
        # Create detailed visualization
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle(f'Face Scanner Analysis - Face {i+1}', fontsize=20, fontweight='bold')
        
        # Original image with face detection
        axes[0, 0].imshow(image)
        rect = patches.Rectangle((left, top), right-left, bottom-top, 
                               linewidth=3, edgecolor='red', facecolor='none')
        axes[0, 0].add_patch(rect)
        axes[0, 0].set_title('Original Image\nwith Face Detection', fontsize=14)
        axes[0, 0].axis('off')
        
        # Face region
        axes[0, 1].imshow(face_region)
        axes[0, 1].set_title('Extracted Face Region', fontsize=14)
        axes[0, 1].axis('off')
        
        # Acne detection
        axes[0, 2].imshow(face_region)
        for x, y in acne_points:
            circle = plt.Circle((x, y), 5, color='red', fill=False, linewidth=2)
            axes[0, 2].add_patch(circle)
        axes[0, 2].set_title(f'Acne Detection\n{len(acne_points)} spots found', fontsize=14)
        axes[0, 2].axis('off')
        
        # Acne mask
        axes[1, 0].imshow(acne_mask, cmap='hot')
        axes[1, 0].set_title('Acne Detection Mask', fontsize=14)
        axes[1, 0].axis('off')
        
        # Heat map
        axes[1, 1].imshow(heat_map, cmap='hot')
        axes[1, 1].set_title('Acne Density Heat Map', fontsize=14)
        axes[1, 1].axis('off')
        
        # Combined visualization
        axes[1, 2].imshow(face_region)
        im = axes[1, 2].imshow(heat_map, cmap='hot', alpha=0.6)
        axes[1, 2].set_title('Heat Map Overlay', fontsize=14)
        axes[1, 2].axis('off')
        
        # Add colorbar
        plt.colorbar(im, ax=axes[1, 2], fraction=0.046, pad=0.04, label='Acne Density')
        
        plt.tight_layout()
        plt.savefig(f"{output_dir}/face_{i+1}_analysis.png", dpi=300, bbox_inches='tight')
        print(f"Detailed analysis saved: {output_dir}/face_{i+1}_analysis.png")
        
        # Create summary visualization
        plt.figure(figsize=(12, 8))
        plt.imshow(face_region)
        plt.imshow(heat_map, cmap='hot', alpha=0.7)
        plt.title(f'Face {i+1} - Acne Heat Map Analysis\n'
                 f'Severity: {severity} | Spots: {len(acne_points)} | '
                 f'Density: {density:.2f}', fontsize=16, pad=20)
        plt.axis('off')
        
        # Add severity indicator
        plt.text(0.02, 0.98, f'SEVERITY: {severity.upper()}', 
                transform=plt.gca().transAxes, fontsize=20, fontweight='bold',
                verticalalignment='top', color=severity_color,
                bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.8))
        
        plt.colorbar(label='Acne Density', shrink=0.8)
        plt.savefig(f"{output_dir}/face_{i+1}_heat_map.png", dpi=300, bbox_inches='tight')
        print(f"Heat map saved: {output_dir}/face_{i+1}_heat_map.png")
        
        plt.close('all')
    
    # Print comprehensive summary
    print("\n" + "="*60)
    print("COMPREHENSIVE ANALYSIS RESULTS")
    print("="*60)
    
    for result in all_results:
        print(f"\nFace {result['face_id']} Summary:")
        print(f"  Size: {result['face_size'][0]}×{result['face_size'][1]} pixels")
        print(f"  Acne spots: {result['spots_count']}")
        print(f"  Density: {result['density']:.2f} spots per 100×100px")
        print(f"  Severity: {result['severity']}")
    
    print(f"\nOutput files saved to: {output_dir}/")
    print("  • face_X_analysis.png - Complete 6-panel analysis")
    print("  • face_X_heat_map.png - Focused heat map visualization")
    
    return all_results


def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(
        description="Enhanced Face Scanner with Acne Detection and Heat Maps",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python enhanced_demo.py                           # Use synthetic face
  python enhanced_demo.py --image my_face.jpg       # Analyze your image
  python enhanced_demo.py --synthetic-only         # Create synthetic only
        """
    )
    
    parser.add_argument('--image', '-i', type=str, help='Path to face image to analyze')
    parser.add_argument('--synthetic-only', '-s', action='store_true', 
                       help='Only create synthetic face image')
    parser.add_argument('--output', '-o', type=str, default='enhanced_output',
                       help='Output directory for results')
    
    args = parser.parse_args()
    
    if args.synthetic_only:
        image_path, spots = create_enhanced_synthetic_face()
        print(f"Created synthetic face: {image_path}")
        return
    
    # Determine image to use
    if args.image:
        image_path = args.image
        if not os.path.exists(image_path):
            print(f"Error: Image file {image_path} not found")
            return
    else:
        # Create synthetic face
        image_path, spots = create_enhanced_synthetic_face()
    
    # Run analysis
    results = run_complete_analysis(image_path, args.output)
    
    if results:
        print(f"\n✅ Analysis completed successfully!")
        print(f"📊 Total faces analyzed: {len(results)}")
        total_spots = sum(r['spots_count'] for r in results)
        print(f"🔴 Total acne spots detected: {total_spots}")


if __name__ == "__main__":
    main()