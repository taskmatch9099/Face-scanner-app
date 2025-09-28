import { FaceDetector, FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

// Global variables for MediaPipe models
let faceDetector: FaceDetector | null = null;
let faceLandmarker: FaceLandmarker | null = null;
let isInitialized = false;

// Face detection result interface
export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: Array<{ x: number; y: number; z?: number }>;
  faceQuality: {
    lighting: 'good' | 'poor' | 'unknown';
    angle: 'frontal' | 'profile' | 'tilted';
    distance: 'optimal' | 'too-close' | 'too-far';
    sharpness: 'sharp' | 'blurry';
  };
  skinRegions?: {
    forehead: { x: number; y: number; width: number; height: number };
    leftCheek: { x: number; y: number; width: number; height: number };
    rightCheek: { x: number; y: number; width: number; height: number };
    nose: { x: number; y: number; width: number; height: number };
    chin: { x: number; y: number; width: number; height: number };
  };
}

// Initialize MediaPipe models
export async function initializeFaceDetection(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  try {
    console.log('Initializing MediaPipe face detection...');
    
    // Initialize the FilesetResolver
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // Create FaceDetector
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
      minSuppressionThreshold: 0.3
    });

    // Create FaceLandmarker for detailed facial analysis
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      numFaces: 1
    });

    isInitialized = true;
    console.log('MediaPipe face detection initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize MediaPipe:', error);
    return false;
  }
}

// Analyze face in image for skin analysis preparation
export async function analyzeFaceForSkinAnalysis(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!isInitialized || !faceDetector || !faceLandmarker) {
    await initializeFaceDetection();
  }

  if (!faceDetector || !faceLandmarker) {
    throw new Error('Face detection models not initialized');
  }

  try {
    // Detect faces
    const detections = faceDetector.detect(imageElement);
    
    if (!detections.detections || detections.detections.length === 0) {
      return {
        detected: false,
        confidence: 0,
        faceQuality: {
          lighting: 'unknown',
          angle: 'frontal',
          distance: 'optimal',
          sharpness: 'sharp'
        }
      };
    }

    const detection = detections.detections[0];
    const bbox = detection.boundingBox!;
    
    // Get facial landmarks
    const landmarkResults = faceLandmarker.detect(imageElement);
    const landmarks = landmarkResults.faceLandmarks?.[0];

    // Analyze face quality for skin analysis
    const faceQuality = analyzeFaceQuality(detection, landmarks, imageElement);
    
    // Extract skin regions based on landmarks
    const skinRegions = landmarks ? extractSkinRegions(landmarks, bbox) : undefined;

    return {
      detected: true,
      confidence: detection.categories?.[0]?.score || 0,
      boundingBox: {
        x: bbox.originX,
        y: bbox.originY,
        width: bbox.width,
        height: bbox.height
      },
      landmarks: landmarks?.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      })),
      faceQuality,
      skinRegions
    };
  } catch (error) {
    console.error('Face analysis failed:', error);
    throw error;
  }
}

// Analyze face quality for optimal skin analysis
function analyzeFaceQuality(
  detection: any,
  landmarks: any,
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): FaceDetectionResult['faceQuality'] {
  const bbox = detection.boundingBox!;
  const imageWidth = imageElement.width || (imageElement as HTMLImageElement).naturalWidth;
  const imageHeight = imageElement.height || (imageElement as HTMLImageElement).naturalHeight;

  // Analyze distance (face should fill 30-70% of image height)
  const faceHeightRatio = bbox.height / imageHeight;
  let distance: 'optimal' | 'too-close' | 'too-far';
  if (faceHeightRatio < 0.3) {
    distance = 'too-far';
  } else if (faceHeightRatio > 0.7) {
    distance = 'too-close';
  } else {
    distance = 'optimal';
  }

  // Analyze angle based on face symmetry (simplified)
  let angle: 'frontal' | 'profile' | 'tilted' = 'frontal';
  if (landmarks && landmarks.length > 0) {
    // Check if face is roughly centered and symmetrical
    const faceCenterX = bbox.originX + bbox.width / 2;
    const imageCenterX = imageWidth / 2;
    const horizontalOffset = Math.abs(faceCenterX - imageCenterX) / imageWidth;
    
    if (horizontalOffset > 0.2) {
      angle = 'profile';
    }
  }

  // Basic lighting analysis (would need more sophisticated analysis)
  const lighting: 'good' | 'poor' | 'unknown' = 'good'; // Placeholder
  
  // Basic sharpness analysis (would need edge detection)
  const sharpness: 'sharp' | 'blurry' = 'sharp'; // Placeholder

  return {
    lighting,
    angle,
    distance,
    sharpness
  };
}

// Extract skin regions based on facial landmarks
function extractSkinRegions(
  landmarks: any[],
  bbox: any
): FaceDetectionResult['skinRegions'] {
  if (!landmarks || landmarks.length < 468) {
    // MediaPipe face landmarker provides 468 landmarks
    return undefined;
  }

  // Define approximate regions based on MediaPipe landmarks
  // These indices are based on MediaPipe's face landmark model
  const foreheadRegion = extractRegionFromLandmarks(landmarks, [9, 10, 151, 337, 299, 333, 298, 301]);
  const leftCheekRegion = extractRegionFromLandmarks(landmarks, [116, 117, 118, 119, 120, 121, 126, 142]);
  const rightCheekRegion = extractRegionFromLandmarks(landmarks, [345, 346, 347, 348, 349, 350, 355, 371]);
  const noseRegion = extractRegionFromLandmarks(landmarks, [1, 2, 5, 4, 6, 19, 20, 94, 125]);
  const chinRegion = extractRegionFromLandmarks(landmarks, [18, 175, 199, 200, 9, 10, 151, 175]);

  return {
    forehead: foreheadRegion,
    leftCheek: leftCheekRegion,
    rightCheek: rightCheekRegion,
    nose: noseRegion,
    chin: chinRegion
  };
}

// Helper function to extract bounding box from landmark points
function extractRegionFromLandmarks(
  landmarks: any[],
  indices: number[]
): { x: number; y: number; width: number; height: number } {
  const points = indices.map(i => landmarks[i]).filter(Boolean);
  
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Real-time face tracking for camera preview
export async function trackFaceInRealTime(
  videoElement: HTMLVideoElement,
  onFaceUpdate: (result: FaceDetectionResult) => void
): Promise<() => void> {
  if (!isInitialized) {
    await initializeFaceDetection();
  }

  let isTracking = true;
  
  const track = async () => {
    if (!isTracking || !videoElement.videoWidth) {
      return;
    }

    try {
      const result = await analyzeFaceForSkinAnalysis(videoElement);
      onFaceUpdate(result);
    } catch (error) {
      console.error('Real-time face tracking error:', error);
    }

    if (isTracking) {
      // Track at ~10 FPS to balance performance and responsiveness
      setTimeout(track, 100);
    }
  };

  track();

  // Return cleanup function
  return () => {
    isTracking = false;
  };
}

// Cleanup function
export function cleanupFaceDetection(): void {
  if (faceDetector) {
    faceDetector.close();
    faceDetector = null;
  }
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
  isInitialized = false;
}
