#!/usr/bin/env python3
"""
Demo script for the Face Scanner application.
This script demonstrates the face scanning capabilities with acne detection and heat maps.
"""

import os
import sys
import argparse
from face_scanner import FaceScanner
from utils import validate_image_path, create_output_directory


def create_sample_face_image():
    """
    Create a simple sample face image for demonstration purposes.
    This creates a basic synthetic face with some texture patterns.
    """
    import numpy as np
    import cv2
    
    try:
        # Create a larger, more realistic face-like image
        height, width = 600, 500
        
        # Create base skin tone
        face_img = np.ones((height, width, 3), dtype=np.uint8)
        face_img[:, :, 0] = 240  # R
        face_img[:, :, 1] = 220  # G  
        face_img[:, :, 2] = 180  # B (BGR format for OpenCV)
        
        # Create an oval face shape
        center_x, center_y = width // 2, height // 2
        face_mask = np.zeros((height, width), dtype=np.uint8)
        cv2.ellipse(face_mask, (center_x, center_y), (180, 220), 0, 0, 360, 255, -1)
        
        # Apply face mask
        for i in range(3):
            face_img[:, :, i] = cv2.bitwise_and(face_img[:, :, i], face_mask)
        
        # Add facial features with more realistic proportions
        # Eyes (dark ovals)
        eye_y = center_y - 80
        cv2.ellipse(face_img, (center_x - 60, eye_y), (25, 15), 0, 0, 360, (40, 40, 40), -1)
        cv2.ellipse(face_img, (center_x + 60, eye_y), (25, 15), 0, 0, 360, (40, 40, 40), -1)
        
        # Eye highlights
        cv2.ellipse(face_img, (center_x - 60, eye_y), (15, 10), 0, 0, 360, (200, 200, 200), -1)
        cv2.ellipse(face_img, (center_x + 60, eye_y), (15, 10), 0, 0, 360, (200, 200, 200), -1)
        
        # Pupils
        cv2.circle(face_img, (center_x - 60, eye_y), 8, (20, 20, 20), -1)
        cv2.circle(face_img, (center_x + 60, eye_y), 8, (20, 20, 20), -1)
        
        # Eyebrows
        cv2.ellipse(face_img, (center_x - 60, eye_y - 30), (30, 8), 0, 0, 360, (100, 80, 60), -1)
        cv2.ellipse(face_img, (center_x + 60, eye_y - 30), (30, 8), 0, 0, 360, (100, 80, 60), -1)
        
        # Nose
        nose_y = center_y - 10
        cv2.ellipse(face_img, (center_x, nose_y), (12, 25), 0, 0, 360, (200, 180, 150), -1)
        # Nostrils
        cv2.ellipse(face_img, (center_x - 8, nose_y + 15), (4, 6), 0, 0, 360, (120, 100, 80), -1)
        cv2.ellipse(face_img, (center_x + 8, nose_y + 15), (4, 6), 0, 0, 360, (120, 100, 80), -1)
        
        # Mouth
        mouth_y = center_y + 60
        cv2.ellipse(face_img, (center_x, mouth_y), (35, 12), 0, 0, 360, (150, 100, 100), -1)
        
        # Add hair/forehead area
        cv2.ellipse(face_img, (center_x, center_y - 150), (160, 100), 0, 0, 360, (80, 60, 40), -1)
        
        # Add some texture to simulate skin imperfections
        np.random.seed(42)  # For reproducible results
        
        # Add random spots to simulate acne - only in face area
        acne_count = 0
        for _ in range(25):
            x = np.random.randint(50, width - 50)
            y = np.random.randint(50, height - 50)
            
            # Check if point is within face mask
            if face_mask[y, x] > 0:
                radius = np.random.randint(2, 8)
                
                # Create darker spots with reddish tint
                base_color = face_img[y, x]
                color = (
                    int(max(0, base_color[0] - np.random.randint(40, 100))),  # Reduce blue
                    int(max(0, base_color[1] - np.random.randint(20, 60))),   # Reduce green  
                    int(max(0, base_color[2] - np.random.randint(10, 40)))    # Reduce red less (BGR format)
                )
                cv2.circle(face_img, (x, y), radius, color, -1)
                acne_count += 1
                
                if acne_count >= 15:  # Limit number of spots
                    break
        
        # Add some noise for texture, but only in face area
        noise = np.random.randint(-15, 15, (height, width, 3))
        for i in range(3):
            face_channel = face_img[:, :, i].astype(np.int16)
            noise_channel = noise[:, :, i]
            # Apply noise only where face mask is present
            face_channel = np.where(face_mask > 0, 
                                  np.clip(face_channel + noise_channel, 0, 255),
                                  face_channel)
            face_img[:, :, i] = face_channel.astype(np.uint8)
        
        # Save the sample image
        cv2.imwrite("sample_face.jpg", face_img)
        print("Created sample face image: sample_face.jpg")
        return True
        
    except Exception as e:
        print(f"Error creating sample image: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_demo(image_path: str = None, create_sample: bool = False):
    """
    Run the face scanner demo.
    
    Args:
        image_path: Path to input image
        create_sample: Whether to create a sample image
    """
    print("Face Scanner Demo - Acne Detection and Heat Map Visualization")
    print("=" * 70)
    
    # Create sample image if requested
    if create_sample or not image_path:
        if not create_sample_face_image():
            print("Failed to create sample image.")
            return
        image_path = "sample_face.jpg"
    
    # Validate image path
    if not validate_image_path(image_path):
        print(f"Error: Invalid image path '{image_path}'")
        print("Please provide a valid image file (jpg, png, bmp, etc.)")
        return
    
    # Initialize face scanner
    scanner = FaceScanner()
    
    # Create output directory
    output_dir = create_output_directory("demo_output")
    print(f"Output will be saved to: {output_dir}")
    print()
    
    # Analyze the image
    print(f"Analyzing image: {image_path}")
    print("Processing...")
    
    try:
        results = scanner.analyze_face(image_path, output_dir)
        
        if "error" in results:
            print(f"Error: {results['error']}")
            return
        
        # Display results
        print("\n" + "="*50)
        print("ANALYSIS RESULTS")
        print("="*50)
        
        print(f"Image analyzed: {results['image_path']}")
        print(f"Faces detected: {results['faces_detected']}")
        print()
        
        if results['face_analyses']:
            for face_analysis in results['face_analyses']:
                print(f"Face {face_analysis['face_id']} Analysis:")
                print(f"  📍 Bounding box: {face_analysis['bounding_box']}")
                print(f"  🔴 Acne spots detected: {face_analysis['acne_count']}")
                print(f"  📊 Acne density: {face_analysis['acne_density']} spots per 100x100px")
                print(f"  ⚠️  Severity level: {face_analysis['severity']}")
                print()
        
        print("📁 Output files generated:")
        print(f"  📊 Complete analysis views: {output_dir}/face_analysis_*.png")
        print(f"  🔥 Heat map overlays: {output_dir}/heat_map_*.png")
        print()
        
        print("✅ Analysis complete!")
        print("Check the output directory for detailed visualizations.")
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main function with command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Face Scanner Demo - Acne Detection and Heat Map Visualization",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python demo.py                          # Create and analyze sample image
  python demo.py --create-sample          # Create sample image only
  python demo.py --image path/to/face.jpg # Analyze specific image
        """
    )
    
    parser.add_argument(
        '--image', '-i',
        type=str,
        help='Path to the input face image'
    )
    
    parser.add_argument(
        '--create-sample', '-s',
        action='store_true',
        help='Create a sample face image for demonstration'
    )
    
    args = parser.parse_args()
    
    # Run the demo
    run_demo(
        image_path=args.image,
        create_sample=args.create_sample or args.image is None
    )


if __name__ == "__main__":
    main()