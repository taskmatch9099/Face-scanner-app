import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { initializeFaceDetection, trackFaceInRealTime, FaceDetectionResult } from 'utils/faceDetection';
import { toast } from 'sonner';

interface CameraWithGuidanceProps {
  onCapture: (file: File) => void;
  isOpen: boolean;
  onClose: () => void;
  privacyMode?: 'local' | 'cloud';
}

interface CaptureGuidance {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  canCapture: boolean;
}

const CameraWithGuidance: React.FC<CameraWithGuidanceProps> = ({
  onCapture,
  isOpen,
  onClose,
  privacyMode = 'cloud'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackingCleanupRef = useRef<(() => void) | null>(null);
  
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [faceDetectionReady, setFaceDetectionReady] = useState(false);
  const [currentGuidance, setCurrentGuidance] = useState<CaptureGuidance>({
    message: 'Initializing camera...',
    type: 'info',
    canCapture: false
  });
  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lightingCalibration, setLightingCalibration] = useState<number>(0);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      toast.success('Camera access granted');
    } catch (error) {
      console.error('Camera access failed:', error);
      setCurrentGuidance({
        message: 'Camera access denied. Please enable camera permissions.',
        type: 'error',
        canCapture: false
      });
      toast.error('Camera access failed');
    }
  }, []);

  // Initialize face detection
  const initializeFaceDetectionModel = useCallback(async () => {
    try {
      console.log('Initializing face detection...');
      const success = await initializeFaceDetection();
      
      if (success) {
        setFaceDetectionReady(true);
        toast.success('Face detection ready');
      } else {
        setCurrentGuidance({
          message: 'Face detection initialization failed. Using basic capture mode.',
          type: 'warning',
          canCapture: true
        });
      }
    } catch (error) {
      console.error('Face detection initialization failed:', error);
      setCurrentGuidance({
        message: 'Face detection not available. Using basic capture mode.',
        type: 'warning',
        canCapture: true
      });
    }
  }, []);

  // Handle video ready
  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
    setCurrentGuidance({
      message: 'Position your face in the center of the frame',
      type: 'info',
      canCapture: true
    });
    
    // Start face tracking if detection is ready
    if (faceDetectionReady && videoRef.current) {
      startFaceTracking();
    }
  }, [faceDetectionReady]);

  // Start real-time face tracking
  const startFaceTracking = useCallback(async () => {
    if (!videoRef.current || !faceDetectionReady) return;
    
    try {
      const cleanup = await trackFaceInRealTime(
        videoRef.current,
        (result: FaceDetectionResult) => {
          setFaceResult(result);
          updateGuidanceFromFaceResult(result);
          drawFaceOverlay(result);
        }
      );
      
      trackingCleanupRef.current = cleanup;
    } catch (error) {
      console.error('Face tracking failed:', error);
    }
  }, [faceDetectionReady]);

  // Update guidance based on face detection result
  const updateGuidanceFromFaceResult = useCallback((result: FaceDetectionResult) => {
    if (!result.detected) {
      setCurrentGuidance({
        message: 'No face detected. Please position your face in the frame.',
        type: 'warning',
        canCapture: false
      });
      return;
    }

    const { faceQuality } = result;
    
    // Check lighting
    if (faceQuality.lighting === 'poor') {
      setCurrentGuidance({
        message: 'Lighting is poor. Try moving to a brighter area or facing a light source.',
        type: 'warning',
        canCapture: false
      });
      return;
    }
    
    // Check distance
    if (faceQuality.distance === 'too-close') {
      setCurrentGuidance({
        message: 'Move back a bit. Your face should fill about half the frame.',
        type: 'warning',
        canCapture: false
      });
      return;
    }
    
    if (faceQuality.distance === 'too-far') {
      setCurrentGuidance({
        message: 'Move closer. Your face should be clearly visible.',
        type: 'warning',
        canCapture: false
      });
      return;
    }
    
    // Check angle
    if (faceQuality.angle === 'profile' || faceQuality.angle === 'tilted') {
      setCurrentGuidance({
        message: 'Please look straight at the camera for the best analysis.',
        type: 'warning',
        canCapture: false
      });
      return;
    }
    
    // Check sharpness
    if (faceQuality.sharpness === 'blurry') {
      setCurrentGuidance({
        message: 'Hold still for a moment to ensure a sharp image.',
        type: 'warning',
        canCapture: false
      });
      return;
    }
    
    // All checks passed
    setCurrentGuidance({
      message: 'Perfect! Ready to capture. Click the capture button.',
      type: 'success',
      canCapture: true
    });
  }, []);

  // Draw face detection overlay
  const drawFaceOverlay = useCallback((result: FaceDetectionResult) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!result.detected || !result.boundingBox) return;
    
    const { boundingBox, faceQuality } = result;
    
    // Draw face bounding box
    ctx.strokeStyle = faceQuality.distance === 'optimal' && 
                     faceQuality.angle === 'frontal' ? 
                     '#10b981' : '#f59e0b'; // Green if good, amber if needs adjustment
    ctx.lineWidth = 3;
    ctx.strokeRect(
      boundingBox.x * canvas.width,
      boundingBox.y * canvas.height,
      boundingBox.width * canvas.width,
      boundingBox.height * canvas.height
    );
    
    // Draw landmarks if available
    if (result.landmarks) {
      ctx.fillStyle = '#3b82f6';
      result.landmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    }
    
    // Draw skin regions if available
    if (result.skinRegions) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      Object.values(result.skinRegions).forEach(region => {
        ctx.strokeRect(
          region.x * canvas.width,
          region.y * canvas.height,
          region.width * canvas.width,
          region.height * canvas.height
        );
      });
      
      ctx.setLineDash([]);
    }
  }, []);

  // Capture photo
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !currentGuidance.canCapture) {
      return;
    }
    
    setIsCapturing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `skin-analysis-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          onCapture(file);
          toast.success('Photo captured successfully!');
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture failed:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  }, [currentGuidance.canCapture, onCapture]);

  // Initialize everything when component opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
      initializeFaceDetectionModel();
    }
    
    return () => {
      // Cleanup on close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (trackingCleanupRef.current) {
        trackingCleanupRef.current();
        trackingCleanupRef.current = null;
      }
      
      setIsVideoReady(false);
      setFaceDetectionReady(false);
      setFaceResult(null);
    };
  }, [isOpen, initializeCamera, initializeFaceDetectionModel]);

  // Start face tracking when both video and detection are ready
  useEffect(() => {
    if (isVideoReady && faceDetectionReady) {
      startFaceTracking();
    }
  }, [isVideoReady, faceDetectionReady, startFaceTracking]);

  if (!isOpen) return null;

  const getGuidanceIcon = () => {
    switch (currentGuidance.type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'error': return <X className="h-5 w-5 text-red-600" />;
      default: return <Camera className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Enhanced Skin Analysis Camera</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {privacyMode === 'local' ? '🔒 Local Processing' : '☁️ Cloud Processing'}
              </Badge>
              {faceDetectionReady && (
                <Badge variant="outline" className="text-xs text-green-700">
                  ✓ Face Detection Active
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Feed */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              onLoadedMetadata={handleVideoReady}
            />
            
            {/* Face Detection Overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'multiply' }}
            />
            
            {/* Capture canvas (hidden) */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Loading overlay */}
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Initializing camera...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Guidance Panel */}
          <Alert className={`${
            currentGuidance.type === 'success' ? 'border-green-200 bg-green-50' :
            currentGuidance.type === 'warning' ? 'border-amber-200 bg-amber-50' :
            currentGuidance.type === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <div className="flex items-center gap-2">
              {getGuidanceIcon()}
              <AlertDescription className="font-medium">
                {currentGuidance.message}
              </AlertDescription>
            </div>
          </Alert>
          
          {/* Face Quality Indicators */}
          {faceResult && faceResult.detected && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  faceResult.faceQuality.lighting === 'good' ? 'bg-green-500' : 'bg-amber-500'
                }`}></span>
                <span>Lighting</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  faceResult.faceQuality.distance === 'optimal' ? 'bg-green-500' : 'bg-amber-500'
                }`}></span>
                <span>Distance</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  faceResult.faceQuality.angle === 'frontal' ? 'bg-green-500' : 'bg-amber-500'
                }`}></span>
                <span>Angle</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  faceResult.faceQuality.sharpness === 'sharp' ? 'bg-green-500' : 'bg-amber-500'
                }`}></span>
                <span>Sharpness</span>
              </div>
            </div>
          )}
          
          {/* Capture Button */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={handleCapture}
              disabled={!currentGuidance.canCapture || isCapturing}
              size="lg"
              className="px-8"
            >
              {isCapturing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </>
              )}
            </Button>
          </div>
          
          {/* Privacy Mode Info */}
          <div className="text-xs text-gray-600 text-center">
            {privacyMode === 'local' ? (
              <span>🔒 Processing happens locally on your device for maximum privacy</span>
            ) : (
              <span>☁️ Using cloud processing for enhanced analysis accuracy</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraWithGuidance;
