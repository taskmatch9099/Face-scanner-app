import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, X, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { initializeFaceDetection, trackFaceInRealTime, FaceDetectionResult } from 'utils/faceDetection';
import { toast } from 'sonner';
import DetectionHeatmap from './DetectionHeatmap';
import ImageUpload from './ImageUpload';

interface EnhancedScannerProps {
  onCapture?: (file: File) => void;
  onAnalysisResult?: (result: LocalAnalysisResult) => void;
  autoStart?: boolean;
  enableLocalAnalysis?: boolean;
  showHeatMap?: boolean;
  width?: number;
  height?: number;
}

interface LocalAnalysisResult {
  metrics: {
    acne: number;
    redness: number;
    oiliness: number;
    dryness: number;
    pores: number;
    darkSpots: number;
  };
  regionScores: {
    forehead?: number;
    leftCheek?: number;
    rightCheek?: number;
    nose?: number;
    chin?: number;
  };
  heat?: {
    grid: number[][];
    width: number;
    height: number;
  };
  confidence: number;
}

interface SkinRegionAnalysis {
  acne: number;
  redness: number;
  oiliness: number;
  pores: number;
  texture: number;
}

const EnhancedScanner: React.FC<EnhancedScannerProps> = ({
  onCapture,
  onAnalysisResult,
  autoStart = false,
  enableLocalAnalysis = true,
  showHeatMap = true,
  width = 720,
  height = 540
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackingCleanupRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedImageRef = useRef<HTMLImageElement>(null);
  
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [faceDetectionReady, setFaceDetectionReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LocalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize face detection
  const initializeFaceDetectionModel = useCallback(async () => {
    try {
      console.log('Initializing enhanced face detection...');
      const success = await initializeFaceDetection();
      
      if (success) {
        setFaceDetectionReady(true);
        toast.success('Enhanced face detection ready');
      } else {
        setError('Face detection initialization failed');
      }
    } catch (error) {
      console.error('Face detection initialization failed:', error);
      setError('Face detection not available');
    }
  }, []);

  // Start camera with improved error handling
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: width },
          height: { ideal: height }
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      toast.success('Camera started');
    } catch (e: any) {
      const errorMsg = e?.message ?? 'Failed to access camera';
      setError(errorMsg);
      setRunning(false);
      toast.error(`Camera error: ${errorMsg}`);
    }
  }, [width, height]);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setRunning(false);
    setIsVideoReady(false);
    
    if (trackingCleanupRef.current) {
      trackingCleanupRef.current();
      trackingCleanupRef.current = null;
    }
    toast.success('Camera stopped');
  }, []);

  // Handle video ready
  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
    
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
          drawFaceOverlay(result);
          
          // Perform local analysis if enabled
          if (enableLocalAnalysis && result.detected && result.skinRegions) {
            performLocalAnalysis(result);
          }
        }
      );
      
      trackingCleanupRef.current = cleanup;
    } catch (error) {
      console.error('Face tracking failed:', error);
    }
  }, [faceDetectionReady, enableLocalAnalysis]);

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
    
    const { boundingBox } = result;
    
    // Draw face bounding box with quality-based color
    const quality = result.faceQuality;
    let strokeColor = '#10b981'; // green for good
    if (quality.lighting === 'poor' || quality.angle !== 'frontal') {
      strokeColor = '#f59e0b'; // yellow for moderate
    }
    if (quality.distance !== 'optimal' || quality.sharpness === 'blurry') {
      strokeColor = '#ef4444'; // red for poor
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      boundingBox.x * canvas.width,
      boundingBox.y * canvas.height,
      boundingBox.width * canvas.width,
      boundingBox.height * canvas.height
    );
    
    // Draw skin regions
    if (result.skinRegions) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      Object.entries(result.skinRegions).forEach(([regionName, region]) => {
        ctx.strokeRect(
          region.x * canvas.width,
          region.y * canvas.height,
          region.width * canvas.width,
          region.height * canvas.height
        );
        
        // Add region label
        ctx.fillStyle = '#3b82f6';
        ctx.font = '12px Arial';
        ctx.fillText(
          regionName,
          region.x * canvas.width + 5,
          region.y * canvas.height + 15
        );
      });
      
      ctx.setLineDash([]);
    }
    
    // Add quality guidance text
    ctx.fillStyle = strokeColor;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(
      getGuidanceText(quality),
      10,
      30
    );
  }, []);

  // Get guidance text based on face quality
  const getGuidanceText = (quality: FaceDetectionResult['faceQuality']): string => {
    if (quality.lighting === 'poor') return '💡 Move to better lighting';
    if (quality.angle !== 'frontal') return '📐 Face the camera directly';
    if (quality.distance === 'too-close') return '↔️ Move further away';
    if (quality.distance === 'too-far') return '↔️ Move closer';
    if (quality.sharpness === 'blurry') return '📷 Hold steady';
    return '✅ Perfect positioning!';
  };

  // Perform local skin analysis
  const performLocalAnalysis = useCallback(async (faceResult: FaceDetectionResult) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis based on face detection regions
      const mockAnalysis: LocalAnalysisResult = {
        metrics: {
          acne: Math.random() * 0.3,
          redness: Math.random() * 0.4,
          oiliness: Math.random() * 0.6,
          dryness: Math.random() * 0.3,
          pores: Math.random() * 0.5,
          darkSpots: Math.random() * 0.2
        },
        regionScores: {
          forehead: faceResult.skinRegions?.forehead ? Math.random() * 0.8 + 0.2 : undefined,
          leftCheek: faceResult.skinRegions?.leftCheek ? Math.random() * 0.8 + 0.2 : undefined,
          rightCheek: faceResult.skinRegions?.rightCheek ? Math.random() * 0.8 + 0.2 : undefined,
          nose: faceResult.skinRegions?.nose ? Math.random() * 0.8 + 0.2 : undefined,
          chin: faceResult.skinRegions?.chin ? Math.random() * 0.8 + 0.2 : undefined
        },
        confidence: faceResult.confidence || 0.8
      };
      
      // Generate heat map
      if (showHeatMap) {
        mockAnalysis.heat = generateHeatMap();
      }
      
      setAnalysisResult(mockAnalysis);
      onAnalysisResult?.(mockAnalysis);
      
    } catch (error) {
      console.error('Local analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, showHeatMap, onAnalysisResult]);

  // Generate heat map for visualization
  const generateHeatMap = useCallback(() => {
    const width = 32;
    const height = 24;
    const grid: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        // Create some realistic heat patterns
        const centerX = width / 2;
        const centerY = height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
        const normalizedDistance = distance / maxDistance;
        
        // Face regions tend to have more issues in T-zone and cheeks
        let intensity = 0;
        if (y < height * 0.4) { // Forehead area
          intensity = Math.random() * 0.6 + 0.2;
        } else if (y > height * 0.6 && x > width * 0.3 && x < width * 0.7) { // Chin area
          intensity = Math.random() * 0.4 + 0.1;
        } else if (x < width * 0.3 || x > width * 0.7) { // Cheek areas
          intensity = Math.random() * 0.7 + 0.1;
        } else { // Nose area
          intensity = Math.random() * 0.8 + 0.1;
        }
        
        grid[y][x] = Math.max(0, Math.min(1, intensity * (1 - normalizedDistance * 0.3)));
      }
    }
    
    return { grid, width, height };
  }, []);

  // Capture photo from video
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !running) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        onCapture?.(file);
        toast.success('Photo captured!');
      }
    }, 'image/jpeg', 0.9);
  }, [running, onCapture]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      // Create object URL for display
      const imageUrl = URL.createObjectURL(file);
      setUploadedImageUrl(imageUrl);
      
      // Load image for analysis
      const img = new Image();
      img.onload = async () => {
        uploadedImageRef.current = img;
        
        // Simulate analysis on uploaded image
        if (enableLocalAnalysis) {
          const mockResult: LocalAnalysisResult = {
            metrics: {
              acne: Math.random() * 0.4,
              redness: Math.random() * 0.5,
              oiliness: Math.random() * 0.6,
              dryness: Math.random() * 0.3,
              pores: Math.random() * 0.5,
              darkSpots: Math.random() * 0.3
            },
            regionScores: {
              forehead: Math.random() * 0.8 + 0.2,
              leftCheek: Math.random() * 0.8 + 0.2,
              rightCheek: Math.random() * 0.8 + 0.2,
              nose: Math.random() * 0.8 + 0.2,
              chin: Math.random() * 0.8 + 0.2
            },
            heat: showHeatMap ? generateHeatMap() : undefined,
            confidence: 0.85
          };
          
          setAnalysisResult(mockResult);
          onAnalysisResult?.(mockResult);
        }
        
        // Call onCapture with the file
        onCapture?.(file);
        setLoading(false);
      };
      
      img.onerror = () => {
        setError('Failed to load image');
        setLoading(false);
      };
      
      img.src = imageUrl;
      
    } catch (error) {
      setError('Failed to process image');
      setLoading(false);
    }
  }, [enableLocalAnalysis, showHeatMap, generateHeatMap, onAnalysisResult, onCapture]);

  // Initialize on mount
  useEffect(() => {
    initializeFaceDetectionModel();
    
    if (autoStart) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [autoStart, initializeFaceDetectionModel, startCamera, stopCamera]);

  // Handle video ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleLoadedMetadata = () => {
      handleVideoReady();
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [handleVideoReady]);

  return (
    <div className="space-y-6">
      {/* Camera Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Live Scanner
            {faceDetectionReady && (
              <Badge variant="outline" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                Enhanced AI Ready
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                running ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-neutral-600">
                {running ? 'Camera is on' : 'Camera is off'}
              </span>
            </div>
            
            <div className="flex gap-2">
              {!running ? (
                <Button onClick={startCamera} disabled={!faceDetectionReady}>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={capturePhoto}
                    variant="outline"
                    disabled={!isVideoReady || !faceResult?.detected}
                  >
                    📸 Capture
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Video Feed */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            
            {/* Overlay Canvas for Face Detection */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Face Detection Status */}
          {running && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {faceResult?.detected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Face detected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-600">Looking for face...</span>
                  </>
                )}
              </div>
              
              {faceResult?.confidence && (
                <span className="text-neutral-500">
                  Confidence: {Math.round(faceResult.confidence * 100)}%
                </span>
              )}
            </div>
          )}

          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload onFile={handleFileUpload} disabled={loading} />
          
          {/* Uploaded Image Display */}
          {uploadedImageUrl && (
            <div className="mt-4 relative inline-block">
              <img
                ref={uploadedImageRef}
                src={uploadedImageUrl}
                alt="Uploaded"
                className="max-h-96 w-auto rounded-lg border shadow-sm"
              />
              
              {/* Heat Map Overlay */}
              {analysisResult?.heat && uploadedImageRef.current && showHeatMap && (
                <DetectionHeatmap 
                  forImage={uploadedImageRef.current}
                  heat={analysisResult.heat}
                  opacity={0.6}
                />
              )}
            </div>
          )}
          
          {loading && (
            <div className="mt-4 text-sm text-blue-600 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              Analyzing image...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(analysisResult.metrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-sm text-neutral-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-lg font-semibold">
                    {Math.round(value * 100)}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>Confidence: {Math.round(analysisResult.confidence * 100)}%</span>
              {isAnalyzing && (
                <span className="flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full" />
                  Analyzing...
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedScanner;
