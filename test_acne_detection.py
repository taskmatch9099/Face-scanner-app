#!/usr/bin/env python3
"""
Test script for acne detection functionality without requiring face detection.
This script tests the acne detection and heat map generation on a sample image region.
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
from face_scanner import FaceScanner
import os


def create_test_skin_patch():
    """Create a test skin patch with simulated acne spots."""
    try:
        # Create a realistic skin patch
        height, width = 300, 300
        
        # Create base skin tone (BGR format)
        skin_patch = np.ones((height, width, 3), dtype=np.uint8)
        skin_patch[:, :, 0] = 180  # B
        skin_patch[:, :, 1] = 200  # G  
        skin_patch[:, :, 2] = 220  # R
        
        # Add skin texture variation
        np.random.seed(42)
        texture_noise = np.random.randint(-20, 20, (height, width, 3))
        skin_patch = np.clip(skin_patch.astype(np.int16) + texture_noise, 0, 255).astype(np.uint8)
        
        # Add simulated acne spots
        acne_spots = []
        for i in range(20):
            x = np.random.randint(30, width - 30)
            y = np.random.randint(30, height - 30)
            radius = np.random.randint(3, 8)
            
            # Create reddish-brown spots
            color = (
                max(0, 100 - np.random.randint(0, 50)),    # B
                max(0, 120 - np.random.randint(0, 60)),    # G  
                max(0, 140 - np.random.randint(0, 40))     # R
            )
            
            cv2.circle(skin_patch, (x, y), radius, color, -1)
            acne_spots.append((x, y))
        
        # Convert to RGB for processing
        skin_patch_rgb = cv2.cvtColor(skin_patch, cv2.COLOR_BGR2RGB)
        
        # Save test image
        cv2.imwrite("test_skin_patch.jpg", skin_patch)
        
        return skin_patch_rgb, acne_spots
        
    except Exception as e:
        print(f"Error creating test skin patch: {e}")
        return None, []


def test_acne_detection():
    """Test the acne detection functionality."""
    print("Testing Acne Detection and Heat Map Generation")
    print("=" * 50)
    
    # Create test skin patch
    skin_patch, expected_spots = create_test_skin_patch()
    if skin_patch is None:
        print("Failed to create test skin patch")
        return
    
    print(f"Created test skin patch with {len(expected_spots)} simulated acne spots")
    
    # Initialize scanner
    scanner = FaceScanner()
    
    # Test acne detection
    print("Running acne detection...")
    acne_mask, detected_spots = scanner.detect_acne(skin_patch)
    
    print(f"Detected {len(detected_spots)} acne spots")
    
    # Test heat map generation
    print("Generating heat map...")
    heat_map = scanner.create_heat_map(skin_patch, detected_spots)
    
    # Create visualization
    fig, axes = plt.subplots(2, 2, figsize=(12, 12))
    fig.suptitle('Acne Detection Test Results', fontsize=16)
    
    # Original skin patch
    axes[0, 0].imshow(skin_patch)
    axes[0, 0].set_title('Original Skin Patch')
    axes[0, 0].axis('off')
    
    # Detected acne spots
    axes[0, 1].imshow(skin_patch)
    for x, y in detected_spots:
        circle = plt.Circle((x, y), 5, color='red', fill=False, linewidth=2)
        axes[0, 1].add_patch(circle)
    axes[0, 1].set_title(f'Detected Acne Spots ({len(detected_spots)})')
    axes[0, 1].axis('off')
    
    # Acne mask
    axes[1, 0].imshow(acne_mask, cmap='hot')
    axes[1, 0].set_title('Acne Detection Mask')
    axes[1, 0].axis('off')
    
    # Heat map overlay
    axes[1, 1].imshow(skin_patch)
    im = axes[1, 1].imshow(heat_map, cmap='hot', alpha=0.6)
    axes[1, 1].set_title('Heat Map Overlay')
    axes[1, 1].axis('off')
    
    # Add colorbar
    plt.colorbar(im, ax=axes[1, 1], fraction=0.046, pad=0.04)
    
    plt.tight_layout()
    
    # Create output directory
    os.makedirs("test_output", exist_ok=True)
    plt.savefig("test_output/acne_detection_test.png", dpi=300, bbox_inches='tight')
    print("Test visualization saved to: test_output/acne_detection_test.png")
    
    # Save individual heat map
    plt.figure(figsize=(8, 8))
    plt.imshow(skin_patch)
    plt.imshow(heat_map, cmap='hot', alpha=0.6)
    plt.title('Acne Heat Map Test')
    plt.axis('off')
    plt.colorbar(label='Acne Density')
    plt.savefig("test_output/heat_map_test.png", dpi=300, bbox_inches='tight')
    print("Heat map saved to: test_output/heat_map_test.png")
    
    plt.close('all')
    
    # Calculate and display statistics
    if detected_spots:
        area = skin_patch.shape[0] * skin_patch.shape[1]
        density = len(detected_spots) / (area / 10000)  # per 100x100 pixel area
        
        print(f"\nDetection Statistics:")
        print(f"Patch size: {skin_patch.shape[1]}x{skin_patch.shape[0]} pixels")
        print(f"Spots detected: {len(detected_spots)}")
        print(f"Acne density: {density:.2f} spots per 100x100px area")
        
        # Severity classification
        if density < 0.5:
            severity = "Clear"
        elif density < 1.5:
            severity = "Mild"
        elif density < 3.0:
            severity = "Moderate"
        else:
            severity = "Severe"
        
        print(f"Severity level: {severity}")
    
    print("\n✅ Acne detection test completed successfully!")
    print("Check the 'test_output' directory for visualizations.")


if __name__ == "__main__":
    test_acne_detection()