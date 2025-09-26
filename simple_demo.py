#!/usr/bin/env python3
"""
Simple demo for face scanner that works with manual face region specification.
This demonstrates the complete face scanning pipeline including face detection simulation.
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
from face_scanner import FaceScanner
import os


def create_realistic_face_demo():
    """Create a comprehensive face scanning demo with manual region specification."""
    
    print("Face Scanner - Complete Demo")
    print("=" * 40)
    
    # Create a realistic skin patch (simulating a face region)
    height, width = 400, 350
    
    # Create base skin tone with variation
    face_region = np.ones((height, width, 3), dtype=np.uint8)
    face_region[:, :, 0] = 220  # R
    face_region[:, :, 1] = 200  # G  
    face_region[:, :, 2] = 180  # B
    
    # Add skin tone variation
    np.random.seed(42)
    
    # Create skin texture with gradients
    for y in range(height):
        for x in range(width):
            # Add slight color variation based on position
            variation = int(10 * np.sin(x * 0.05) * np.cos(y * 0.05))
            face_region[y, x, 0] = np.clip(int(face_region[y, x, 0]) + variation, 0, 255)
            face_region[y, x, 1] = np.clip(int(face_region[y, x, 1]) + variation, 0, 255) 
            face_region[y, x, 2] = np.clip(int(face_region[y, x, 2]) + variation, 0, 255)
    
    # Add realistic noise
    noise = np.random.randint(-15, 15, (height, width, 3))
    face_region = np.clip(face_region.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Add acne spots with realistic distribution
    acne_spots_added = []
    
    # Concentrated areas (like T-zone)
    t_zone_areas = [
        (width//2, height//3, 80, 60),      # Forehead
        (width//2, height//2, 40, 80),      # Nose area  
        (width//2, 2*height//3, 60, 40)     # Chin area
    ]
    
    total_spots = 0
    for center_x, center_y, area_w, area_h in t_zone_areas:
        spots_in_area = np.random.randint(3, 8)
        for _ in range(spots_in_area):
            x = np.random.randint(max(0, center_x - area_w//2), 
                                min(width, center_x + area_w//2))
            y = np.random.randint(max(0, center_y - area_h//2), 
                                min(height, center_y + area_h//2))
            
            # Vary spot size and intensity
            radius = np.random.randint(2, 6)
            intensity = np.random.randint(40, 80)
            
            # Create reddish-brown spots
            base_color = face_region[y, x]
            color = (
                max(0, int(base_color[0]) - intensity),
                max(0, int(base_color[1]) - intensity//2),
                max(0, int(base_color[2]) - intensity//3)
            )
            
            cv2.circle(face_region, (x, y), radius, color, -1)
            acne_spots_added.append((x, y))
            total_spots += 1
    
    # Add some random scattered spots
    for _ in range(5):
        x = np.random.randint(50, width - 50)
        y = np.random.randint(50, height - 50)
        radius = np.random.randint(1, 4)
        intensity = np.random.randint(30, 60)
        
        base_color = face_region[y, x]
        color = (
            max(0, int(base_color[0]) - intensity),
            max(0, int(base_color[1]) - intensity//2),
            max(0, int(base_color[2]) - intensity//3)
        )
        
        cv2.circle(face_region, (x, y), radius, color, -1)
        acne_spots_added.append((x, y))
        total_spots += 1
    
    print(f"Created face region with {total_spots} simulated acne spots")
    
    # Initialize scanner
    scanner = FaceScanner()
    
    # Analyze the face region
    print("Running acne detection...")
    acne_mask, detected_spots = scanner.detect_acne(face_region)
    print(f"Detected {len(detected_spots)} acne spots")
    
    # Generate heat map
    print("Generating heat map...")
    heat_map = scanner.create_heat_map(face_region, detected_spots)
    
    # Calculate severity
    area = height * width
    density = len(detected_spots) / (area / 10000)
    
    if density < 0.5:
        severity = "Clear"
    elif density < 1.5:
        severity = "Mild"
    elif density < 3.0:
        severity = "Moderate"
    else:
        severity = "Severe"
    
    # Create comprehensive visualization
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    fig.suptitle('Face Scanner - Complete Analysis Demo', fontsize=20)
    
    # Original face region
    axes[0, 0].imshow(face_region)
    axes[0, 0].set_title('Simulated Face Region', fontsize=14)
    axes[0, 0].axis('off')
    
    # Acne detection overlay
    axes[0, 1].imshow(face_region)
    for x, y in detected_spots:
        circle = plt.Circle((x, y), 4, color='red', fill=False, linewidth=2)
        axes[0, 1].add_patch(circle)
    axes[0, 1].set_title(f'Acne Detection\n({len(detected_spots)} spots found)', fontsize=14)
    axes[0, 1].axis('off')
    
    # Heat map
    axes[0, 2].imshow(heat_map, cmap='hot')
    axes[0, 2].set_title('Acne Density Heat Map', fontsize=14)
    axes[0, 2].axis('off')
    
    # Acne mask
    axes[1, 0].imshow(acne_mask, cmap='Reds')
    axes[1, 0].set_title('Acne Detection Mask', fontsize=14)
    axes[1, 0].axis('off')
    
    # Heat map overlay
    axes[1, 1].imshow(face_region)
    im = axes[1, 1].imshow(heat_map, cmap='hot', alpha=0.6)
    axes[1, 1].set_title('Heat Map Overlay', fontsize=14)
    axes[1, 1].axis('off')
    
    # Statistics panel
    axes[1, 2].axis('off')
    stats_text = f"""
ANALYSIS RESULTS

Spots Detected: {len(detected_spots)}
Face Area: {width}×{height} px
Acne Density: {density:.2f}
    spots per 100×100px

Severity Level: {severity}

CLASSIFICATION SCALE:
• Clear: < 0.5 density
• Mild: 0.5 - 1.5 density  
• Moderate: 1.5 - 3.0 density
• Severe: > 3.0 density

Heat Map Legend:
🔥 Red = High density
🟡 Yellow = Moderate
🔵 Blue = Low/None
    """
    
    axes[1, 2].text(0.05, 0.95, stats_text, transform=axes[1, 2].transAxes,
                   fontsize=12, verticalalignment='top', fontfamily='monospace',
                   bbox=dict(boxstyle="round,pad=0.5", facecolor="lightgray", alpha=0.8))
    
    # Add colorbar
    plt.colorbar(im, ax=axes[1, 1], fraction=0.046, pad=0.04, label='Acne Density')
    
    plt.tight_layout()
    
    # Save results
    os.makedirs("demo_results", exist_ok=True)
    plt.savefig("demo_results/complete_face_analysis.png", dpi=300, bbox_inches='tight')
    print("Complete analysis saved to: demo_results/complete_face_analysis.png")
    
    # Save the face region for reference
    cv2.imwrite("demo_results/face_region.jpg", cv2.cvtColor(face_region, cv2.COLOR_RGB2BGR))
    
    # Create a focused heat map visualization
    plt.figure(figsize=(10, 8))
    plt.imshow(face_region)
    plt.imshow(heat_map, cmap='hot', alpha=0.7)
    plt.title(f'Face Scanner - Acne Heat Map\nSeverity: {severity} ({len(detected_spots)} spots)', 
              fontsize=16, pad=20)
    plt.axis('off')
    
    # Add colorbar with custom labels
    cbar = plt.colorbar(label='Acne Density', shrink=0.8)
    cbar.ax.tick_params(labelsize=12)
    
    plt.savefig("demo_results/focused_heat_map.png", dpi=300, bbox_inches='tight')
    print("Focused heat map saved to: demo_results/focused_heat_map.png")
    
    plt.close('all')
    
    # Print summary
    print("\n" + "="*50)
    print("FACE SCANNER ANALYSIS COMPLETE")
    print("="*50)
    print(f"📊 Analysis Summary:")
    print(f"   Acne spots detected: {len(detected_spots)}")
    print(f"   Face region: {width}×{height} pixels")
    print(f"   Acne density: {density:.2f} spots per 100×100px")
    print(f"   Severity classification: {severity}")
    print(f"\n📁 Output files:")
    print(f"   Complete analysis: demo_results/complete_face_analysis.png")
    print(f"   Focused heat map: demo_results/focused_heat_map.png")
    print(f"   Face region: demo_results/face_region.jpg")
    print(f"\n✅ Demo completed successfully!")
    
    return {
        'spots_detected': len(detected_spots),
        'density': density,
        'severity': severity,
        'face_size': (width, height)
    }


if __name__ == "__main__":
    results = create_realistic_face_demo()