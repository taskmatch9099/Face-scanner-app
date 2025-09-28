#!/usr/bin/env python3
"""
Face Scanner App with Acne Detection and Heat Map Visualization
===============================================================

This application provides:
1. Facial recognition and detection
2. Acne detection using computer vision
3. Heat map visualization of acne severity
4. Comprehensive face analysis report
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image, ImageEnhance
from scipy import ndimage
from typing import List, Tuple, Dict, Optional
import os


class FaceScanner:
    """Main class for face scanning with acne detection and heat map generation."""
    
    def __init__(self):
        """Initialize the FaceScanner with default parameters."""
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.acne_threshold = 50  # Threshold for acne detection
        self.heat_map_intensity = 0.7  # Heat map overlay intensity
        
    def load_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Load an image from file path.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            numpy array of the image or None if failed
        """
        try:
            image = cv2.imread(image_path)
            if image is None:
                print(f"Error: Could not load image from {image_path}")
                return None
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        except Exception as e:
            print(f"Error loading image: {e}")
            return None
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in the image using OpenCV Haar cascades.
        
        Args:
            image: Input image as numpy array
            
        Returns:
            List of face bounding boxes (top, right, bottom, left) - converted to face_recognition format
        """
        try:
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Detect faces using Haar cascade
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            # Convert from OpenCV format (x, y, w, h) to face_recognition format (top, right, bottom, left)
            face_locations = []
            for (x, y, w, h) in faces:
                top = y
                right = x + w
                bottom = y + h
                left = x
                face_locations.append((top, right, bottom, left))
            
            return face_locations
        except Exception as e:
            print(f"Error detecting faces: {e}")
            return []
    
    def detect_acne(self, face_region: np.ndarray) -> Tuple[np.ndarray, List[Tuple[int, int]]]:
        """
        Detect acne spots in a face region using computer vision techniques.
        
        Args:
            face_region: Cropped face region as numpy array
            
        Returns:
            Tuple of (acne_mask, acne_points)
        """
        try:
            # Convert to HSV for better skin tone detection
            hsv = cv2.cvtColor(face_region, cv2.COLOR_RGB2HSV)
            
            # Create skin mask
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)
            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
            
            # Convert to grayscale for texture analysis
            gray = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Detect spots using adaptive thresholding
            adaptive_thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
            )
            
            # Combine with skin mask
            acne_candidates = cv2.bitwise_and(adaptive_thresh, skin_mask)
            
            # Apply morphological operations to clean up
            kernel = np.ones((3, 3), np.uint8)
            acne_candidates = cv2.morphologyEx(acne_candidates, cv2.MORPH_CLOSE, kernel)
            acne_candidates = cv2.morphologyEx(acne_candidates, cv2.MORPH_OPEN, kernel)
            
            # Find contours for acne spots
            contours, _ = cv2.findContours(acne_candidates, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            acne_points = []
            acne_mask = np.zeros_like(gray)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if 5 < area < 200:  # Filter by area to remove noise and large regions
                    # Get center point
                    M = cv2.moments(contour)
                    if M["m00"] != 0:
                        cx = int(M["m10"] / M["m00"])
                        cy = int(M["m01"] / M["m00"])
                        acne_points.append((cx, cy))
                        
                        # Draw on mask
                        cv2.drawContours(acne_mask, [contour], -1, 255, -1)
            
            return acne_mask, acne_points
            
        except Exception as e:
            print(f"Error detecting acne: {e}")
            return np.zeros_like(face_region[:,:,0]), []
    
    def create_heat_map(self, face_region: np.ndarray, acne_points: List[Tuple[int, int]]) -> np.ndarray:
        """
        Create a heat map based on acne density.
        
        Args:
            face_region: Face region image
            acne_points: List of acne spot coordinates
            
        Returns:
            Heat map as numpy array
        """
        try:
            height, width = face_region.shape[:2]
            heat_map = np.zeros((height, width), dtype=np.float32)
            
            # Create heat spots around each acne point
            for x, y in acne_points:
                # Create a Gaussian kernel around each point
                y_grid, x_grid = np.ogrid[:height, :width]
                distance = np.sqrt((x_grid - x)**2 + (y_grid - y)**2)
                
                # Create Gaussian distribution with sigma=15
                gaussian = np.exp(-(distance**2) / (2 * 15**2))
                heat_map += gaussian
            
            # Normalize heat map
            if heat_map.max() > 0:
                heat_map = heat_map / heat_map.max()
            
            return heat_map
            
        except Exception as e:
            print(f"Error creating heat map: {e}")
            return np.zeros((face_region.shape[0], face_region.shape[1]))
    
    def analyze_face(self, image_path: str, output_dir: str = "output") -> Dict:
        """
        Perform complete face analysis including acne detection and heat map generation.
        
        Args:
            image_path: Path to input image
            output_dir: Directory to save output images
            
        Returns:
            Dictionary with analysis results
        """
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Load image
        image = self.load_image(image_path)
        if image is None:
            return {"error": "Could not load image"}
        
        # Detect faces
        face_locations = self.detect_faces(image)
        if not face_locations:
            return {"error": "No faces detected in image"}
        
        results = {
            "image_path": image_path,
            "faces_detected": len(face_locations),
            "face_analyses": []
        }
        
        # Analyze each face
        for i, (top, right, bottom, left) in enumerate(face_locations):
            # Extract face region
            face_region = image[top:bottom, left:right]
            
            # Detect acne
            acne_mask, acne_points = self.detect_acne(face_region)
            
            # Create heat map
            heat_map = self.create_heat_map(face_region, acne_points)
            
            # Calculate acne severity
            acne_count = len(acne_points)
            face_area = (bottom - top) * (right - left)
            acne_density = acne_count / (face_area / 10000)  # Per 100x100 pixel area
            
            # Determine severity level
            if acne_density < 0.5:
                severity = "Mild"
            elif acne_density < 1.5:
                severity = "Moderate"
            else:
                severity = "Severe"
            
            face_analysis = {
                "face_id": i + 1,
                "bounding_box": (top, right, bottom, left),
                "acne_count": acne_count,
                "acne_density": round(acne_density, 2),
                "severity": severity
            }
            
            results["face_analyses"].append(face_analysis)
            
            # Save visualizations
            self._save_visualizations(
                image, face_region, acne_mask, heat_map, 
                (top, right, bottom, left), acne_points, 
                i, output_dir
            )
        
        return results
    
    def _save_visualizations(self, original_image: np.ndarray, face_region: np.ndarray,
                           acne_mask: np.ndarray, heat_map: np.ndarray,
                           bbox: Tuple[int, int, int, int], acne_points: List[Tuple[int, int]],
                           face_id: int, output_dir: str):
        """Save various visualizations of the analysis."""
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        fig.suptitle(f'Face Analysis Results - Face {face_id + 1}', fontsize=16)
        
        # Original image with face detection
        axes[0, 0].imshow(original_image)
        axes[0, 0].set_title('Original Image with Face Detection')
        top, right, bottom, left = bbox
        rect = patches.Rectangle((left, top), right-left, bottom-top, 
                               linewidth=2, edgecolor='r', facecolor='none')
        axes[0, 0].add_patch(rect)
        axes[0, 0].axis('off')
        
        # Face region
        axes[0, 1].imshow(face_region)
        axes[0, 1].set_title('Extracted Face Region')
        axes[0, 1].axis('off')
        
        # Acne detection
        axes[0, 2].imshow(face_region)
        axes[0, 2].set_title(f'Acne Detection ({len(acne_points)} spots)')
        for x, y in acne_points:
            circle = patches.Circle((x, y), 3, color='red', alpha=0.7)
            axes[0, 2].add_patch(circle)
        axes[0, 2].axis('off')
        
        # Acne mask
        axes[1, 0].imshow(acne_mask, cmap='hot')
        axes[1, 0].set_title('Acne Mask')
        axes[1, 0].axis('off')
        
        # Heat map
        axes[1, 1].imshow(heat_map, cmap='hot', alpha=0.8)
        axes[1, 1].set_title('Acne Density Heat Map')
        axes[1, 1].axis('off')
        
        # Combined view
        axes[1, 2].imshow(face_region)
        im = axes[1, 2].imshow(heat_map, cmap='hot', alpha=0.6)
        axes[1, 2].set_title('Face with Heat Map Overlay')
        axes[1, 2].axis('off')
        
        # Add colorbar for heat map
        plt.colorbar(im, ax=axes[1, 2], fraction=0.046, pad=0.04)
        
        plt.tight_layout()
        plt.savefig(f"{output_dir}/face_analysis_{face_id + 1}.png", dpi=300, bbox_inches='tight')
        plt.close()
        
        # Save individual heat map overlay
        plt.figure(figsize=(8, 8))
        plt.imshow(face_region)
        plt.imshow(heat_map, cmap='hot', alpha=0.6)
        plt.title(f'Face {face_id + 1} - Acne Heat Map')
        plt.axis('off')
        plt.colorbar(label='Acne Density')
        plt.savefig(f"{output_dir}/heat_map_{face_id + 1}.png", dpi=300, bbox_inches='tight')
        plt.close()


def main():
    """Main function to run the face scanner application."""
    scanner = FaceScanner()
    
    # Example usage
    print("Face Scanner - Acne Detection and Heat Map Visualization")
    print("=" * 60)
    
    # You can replace this with any image path
    sample_image = "sample_face.jpg"
    
    if not os.path.exists(sample_image):
        print(f"Sample image '{sample_image}' not found.")
        print("Please provide a face image to analyze.")
        print("\nUsage:")
        print("python face_scanner.py")
        print("Then place your image as 'sample_face.jpg' in the same directory")
        return
    
    # Analyze the image
    results = scanner.analyze_face(sample_image)
    
    if "error" in results:
        print(f"Error: {results['error']}")
        return
    
    # Print results
    print(f"Analysis Results for: {results['image_path']}")
    print(f"Faces detected: {results['faces_detected']}")
    print()
    
    for face_analysis in results['face_analyses']:
        print(f"Face {face_analysis['face_id']}:")
        print(f"  Acne spots detected: {face_analysis['acne_count']}")
        print(f"  Acne density: {face_analysis['acne_density']} spots per 100x100px")
        print(f"  Severity level: {face_analysis['severity']}")
        print()
    
    print("Visualizations saved in 'output' directory:")
    print("- face_analysis_X.png: Complete analysis view")
    print("- heat_map_X.png: Heat map overlay")


if __name__ == "__main__":
    main()