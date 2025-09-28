#!/usr/bin/env python3
"""
Utility functions for the Face Scanner application.
"""

import cv2
import numpy as np
from PIL import Image, ImageEnhance
from typing import Tuple, Optional
import os


def enhance_image_quality(image: np.ndarray, brightness: float = 1.0, 
                         contrast: float = 1.2, saturation: float = 1.1) -> np.ndarray:
    """
    Enhance image quality by adjusting brightness, contrast, and saturation.
    
    Args:
        image: Input image as numpy array
        brightness: Brightness factor (1.0 = no change)
        contrast: Contrast factor (1.0 = no change)
        saturation: Saturation factor (1.0 = no change)
        
    Returns:
        Enhanced image as numpy array
    """
    try:
        # Convert to PIL Image
        pil_image = Image.fromarray(image)
        
        # Enhance brightness
        enhancer = ImageEnhance.Brightness(pil_image)
        pil_image = enhancer.enhance(brightness)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(pil_image)
        pil_image = enhancer.enhance(contrast)
        
        # Enhance color saturation
        enhancer = ImageEnhance.Color(pil_image)
        pil_image = enhancer.enhance(saturation)
        
        return np.array(pil_image)
        
    except Exception as e:
        print(f"Error enhancing image: {e}")
        return image


def preprocess_for_acne_detection(image: np.ndarray) -> np.ndarray:
    """
    Preprocess image specifically for better acne detection.
    
    Args:
        image: Input face region
        
    Returns:
        Preprocessed image
    """
    try:
        # Apply bilateral filter to reduce noise while preserving edges
        filtered = cv2.bilateralFilter(image, 9, 75, 75)
        
        # Enhance local contrast using CLAHE
        if len(filtered.shape) == 3:
            # Convert to LAB color space
            lab = cv2.cvtColor(filtered, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge back
            enhanced = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        else:
            # Grayscale image
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(filtered)
        
        return enhanced
        
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return image


def create_skin_mask(image: np.ndarray) -> np.ndarray:
    """
    Create a mask for skin regions in the image.
    
    Args:
        image: Input image in RGB format
        
    Returns:
        Binary mask where skin regions are white
    """
    try:
        # Convert to different color spaces for better skin detection
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        ycrcb = cv2.cvtColor(image, cv2.COLOR_RGB2YCrCb)
        
        # Define skin color ranges in HSV
        lower_hsv = np.array([0, 20, 70], dtype=np.uint8)
        upper_hsv = np.array([20, 255, 255], dtype=np.uint8)
        mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)
        
        # Define skin color ranges in YCrCb
        lower_ycrcb = np.array([0, 135, 85], dtype=np.uint8)
        upper_ycrcb = np.array([255, 180, 135], dtype=np.uint8)
        mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)
        
        # Combine masks
        skin_mask = cv2.bitwise_and(mask_hsv, mask_ycrcb)
        
        # Apply morphological operations to smooth the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
        
        return skin_mask
        
    except Exception as e:
        print(f"Error creating skin mask: {e}")
        return np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)


def calculate_acne_severity_score(acne_count: int, face_area: int) -> Tuple[float, str]:
    """
    Calculate acne severity score and classification.
    
    Args:
        acne_count: Number of acne spots detected
        face_area: Area of the face region in pixels
        
    Returns:
        Tuple of (severity_score, severity_level)
    """
    # Normalize by face area (per 10,000 pixels)
    density = acne_count / (face_area / 10000)
    
    # Calculate severity score (0-100)
    severity_score = min(density * 20, 100)
    
    # Classify severity
    if severity_score < 20:
        severity_level = "Clear"
    elif severity_score < 40:
        severity_level = "Mild"
    elif severity_score < 60:
        severity_level = "Moderate"
    elif severity_score < 80:
        severity_level = "Severe"
    else:
        severity_level = "Very Severe"
    
    return round(severity_score, 1), severity_level


def validate_image_path(image_path: str) -> bool:
    """
    Validate if the image path exists and is a valid image file.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        True if valid, False otherwise
    """
    if not os.path.exists(image_path):
        return False
    
    valid_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
    file_extension = os.path.splitext(image_path)[1].lower()
    
    return file_extension in valid_extensions


def resize_image_if_needed(image: np.ndarray, max_size: int = 1200) -> np.ndarray:
    """
    Resize image if it's too large, maintaining aspect ratio.
    
    Args:
        image: Input image
        max_size: Maximum dimension size
        
    Returns:
        Resized image
    """
    try:
        height, width = image.shape[:2]
        max_dim = max(height, width)
        
        if max_dim > max_size:
            scale = max_size / max_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            return resized
        
        return image
        
    except Exception as e:
        print(f"Error resizing image: {e}")
        return image


def create_output_directory(base_dir: str = "output") -> str:
    """
    Create output directory with timestamp.
    
    Args:
        base_dir: Base directory name
        
    Returns:
        Path to created directory
    """
    from datetime import datetime
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = f"{base_dir}_{timestamp}"
    
    os.makedirs(output_dir, exist_ok=True)
    return output_dir