import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Sparkles, Camera, Upload, Download, Share } from 'lucide-react';
import { toast } from 'sonner';
import brain from 'brain';
import EnhancedScanner from 'components/EnhancedScanner';
import DetectionsOverlay from 'components/DetectionsOverlay';
import { API_URL } from 'app';
import { auth } from 'app';
import { RecommendedProducts } from 'components/RecommendedProducts';
import { Skeleton } from '@/components/ui/skeleton';
import HeatmapGallery from 'components/HeatmapGallery';

// Enhanced result interface that matches our new scanner
interface AnalysisResult {
  overallScore: number;
  acne: number;
  redness: number;
  oiliness: number;
  dryness: number;
  pores: number;
  darkSpots: number;
  skinType: string;
  recommendations: string[];
  regionScores?: {
    forehead?: number;
    leftCheek?: number;
    rightCheek?: number;
    nose?: number;
    chin?: number;
  };
  confidence?: number;
  detections?: { x: number; y: number; width: number; height: number; confidence: number; class_name?: string | null }[];
  imageSize?: { width: number; height: number };
}

const Analysis = () => {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [localAnalysisEnabled, setLocalAnalysisEnabled] = useState(true);

  // Image preview and overlay
  const [analyzedImageUrl, setAnalyzedImageUrl] = useState<string | null>(null);
  const analyzedImgRef = useRef<HTMLImageElement>(null);
  const [overlayMode, setOverlayMode] = useState<'heat' | 'boxes'>('heat');
  const [imageReady, setImageReady] = useState(false);
  // Product recommendations state
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ acneSafeOnly: boolean; fragranceFreeOnly: boolean }>({ acneSafeOnly: false, fragranceFreeOnly: false });

  useEffect(() => {
    return () => {
      if (analyzedImageUrl) URL.revokeObjectURL(analyzedImageUrl);
    };
  }, [analyzedImageUrl]);

  // When a new file/image is set, reset imageReady; set true on image load
  useEffect(() => {
    setImageReady(false);
  }, [analyzedImageUrl]);

  // Fetch product recommendations whenever analysis changes
  useEffect(() => {
    const fetchProducts = async () => {
      if (!analysisResult) return;
      setProductsLoading(true);
      setProductsError(null);
      try {
        const url = `${API_URL}/routes/recommend-products`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = await auth.getAuthToken();
        if (token) headers.Authorization = await auth.getAuthHeaderValue();
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            skinType: analysisResult.skinType,
            acne: analysisResult.acne,
            redness: analysisResult.redness,
            oiliness: analysisResult.oiliness,
            dryness: analysisResult.dryness,
            pores: analysisResult.pores,
            darkSpots: analysisResult.darkSpots,
            concerns: [],
            acneSafeOnly: filters.acneSafeOnly,
            fragranceFreeOnly: filters.fragranceFreeOnly,
          })
        });
        if (!res.ok) {
          if (res.status === 401) {
            setProductsError('Sign in to view tailored product recommendations, or open the API.');
          } else {
            const text = await res.text();
            setProductsError(text || 'Failed to load recommendations');
          }
          setProducts([]);
        } else {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e: any) {
        setProductsError('Failed to load recommendations');
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult, filters.acneSafeOnly, filters.fragranceFreeOnly]);

  // Handle file capture from enhanced scanner
  const handleFileCapture = async (file: File) => {
    setCapturedFile(file);
    setAnalyzedImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    
    // Auto-analyze if we have a file
    if (file) {
      await performAnalysis(file);
    }
  };

  // Handle local analysis results from enhanced scanner
  const handleLocalAnalysisResult = (result: any) => {
    // Convert local analysis result to our format
    const convertedResult: AnalysisResult = {
      overallScore: Math.round((1 - (result.metrics.acne + result.metrics.redness) / 2) * 100),
      acne: Math.round(result.metrics.acne * 100),
      redness: Math.round(result.metrics.redness * 100),
      oiliness: Math.round(result.metrics.oiliness * 100),
      dryness: Math.round(result.metrics.dryness * 100),
      pores: Math.round(result.metrics.pores * 100),
      darkSpots: Math.round(result.metrics.darkSpots * 100),
      skinType: determineSkinType(result.metrics),
      recommendations: generateRecommendations(result.metrics),
      regionScores: result.regionScores,
      confidence: result.confidence
    };
    
    setAnalysisResult(convertedResult);
  };

  // Determine skin type based on metrics
  const determineSkinType = (metrics: any): string => {
    if (metrics.oiliness > 0.7) return 'Oily';
    if (metrics.dryness > 0.6) return 'Dry';
    if (metrics.oiliness > 0.4 && metrics.dryness > 0.4) return 'Combination';
    if (metrics.redness > 0.5) return 'Sensitive';
    return 'Normal';
  };

  // Generate recommendations based on metrics
  const generateRecommendations = (metrics: any): string[] => {
    const recommendations: string[] = [];
    
    if (metrics.acne > 0.4) {
      recommendations.push('Use salicylic acid cleanser to help reduce acne');
      recommendations.push('Consider adding a retinoid to your routine');
    }
    
    if (metrics.redness > 0.4) {
      recommendations.push('Use gentle, fragrance-free products');
      recommendations.push('Apply a soothing moisturizer with niacinamide');
    }
    
    if (metrics.oiliness > 0.6) {
      recommendations.push('Use clay masks 2-3 times per week');
      recommendations.push('Choose oil-free, non-comedogenic products');
    }
    
    if (metrics.dryness > 0.5) {
      recommendations.push('Use a hydrating serum with hyaluronic acid');
      recommendations.push('Apply a rich moisturizer morning and night');
    }
    
    if (metrics.darkSpots > 0.4) {
      recommendations.push('Use vitamin C serum in the morning');
      recommendations.push('Always apply SPF 30+ sunscreen');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your skin looks healthy! Maintain your current routine');
      recommendations.push('Continue with daily cleansing and moisturizing');
    }
    
    return recommendations;
  };

  // Perform backend analysis (Roboflow endpoint)
  const performAnalysis = async (file: File) => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const url = `${API_URL}/routes/analyze_acne_roboflow`;

      // Include Authorization header only if token exists (page may be open)
      const headers: Record<string, string> = {};
      const token = await auth.getAuthToken();
      if (token) {
        headers.Authorization = await auth.getAuthHeaderValue();
      }

      const response = await fetch(url, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        const status = response.status;
        let message = 'Analysis failed';
        try {
          const maybeJson = await response.clone().json();
          message = (maybeJson?.detail as string) || JSON.stringify(maybeJson);
        } catch (_) {
          const text = await response.text();
          if (text) message = text;
        }

        if (status === 401) {
          toast.error('Scan requires sign-in or open API. Sign in or ask to open the analysis API.');
        } else if (status === 413) {
          toast.error('Image too large. Please upload a smaller photo.');
        } else if (status === 415) {
          toast.error('Unsupported image format. Please use JPG or PNG.');
        } else {
          toast.error(message);
        }
        throw new Error(`${status}: ${message}`);
      }
      const data = await response.json();
      const mapped: AnalysisResult = {
        overallScore: data.overallScore,
        acne: data.acne,
        redness: data.redness,
        oiliness: data.oiliness,
        dryness: data.dryness,
        pores: data.pores,
        darkSpots: data.darkSpots,
        skinType: data.skinType,
        recommendations: data.recommendations,
        regionScores: data.regionScores,
        confidence: data.confidence,
        detections: data.detections,
        imageSize: data.imageSize
      };
      setAnalysisResult(mapped);
      toast.success('Analysis completed successfully!');

      // Save to history (mapped to expected payload)
      await saveToHistory(mapped);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Generic fallback toast already handled in status-specific branches
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save analysis to history using brain client types
  const saveToHistory = async (result: AnalysisResult) => {
    try {
      const concerns = [
        {
          name: 'Acne',
          severity: (result.acne ?? 0) / 100,
          dermatologist_summary: `Detected acne likelihood with ${result.detections?.length ?? 0} regions. Overall score ${result.overallScore}/100.`,
          bounding_boxes: (result.detections || []).map(d => ({
            x: d.x,
            y: d.y,
            width: d.width,
            height: d.height,
            confidence: d.confidence,
            class_name: d.class_name || 'acne'
          }))
        }
      ];

      const recommendations = {
        summary: 'Roboflow acne analysis with personalized suggestions',
        routine: {
          morning: ['Gentle cleanser', 'Vitamin C serum (if tolerated)', 'Moisturizer', 'SPF 30+'],
          evening: ['Gentle cleanser', 'Hydrating serum', 'Moisturizer'],
          treatments: result.acne >= 40
            ? ['Salicylic acid 3-4x/week', 'Non-comedogenic moisturizer', 'Retinoid (2-3x/week)']
            : result.acne >= 20
            ? ['Gentle cleanser', 'Spot treat with 2% SA or BP']
            : ['Maintain gentle routine', 'Daily SPF 30+']
        },
        lifestyle_tips: [
          'Stay hydrated and manage stress',
          'Avoid picking and keep pillowcases/phones clean'
        ]
      };

      const mesh_data = [
        {
          source: 'roboflow',
          confidence: result.confidence,
          detections: result.detections,
          imageSize: result.imageSize
        }
      ];

      await brain.save_analysis_history({ concerns, mesh_data, recommendations } as any);
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get badge color based on value
  const getBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Skin Analysis</h1>
              <p className="text-neutral-600">AI-powered skin health assessment</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              <Sparkles className="h-3 w-3 mr-1" />
              Enhanced AI
            </Badge>
            {localAnalysisEnabled && (
              <Badge variant="outline" className="bg-white">
                🧠 Real-time Analysis
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Scanner */}
          <div className="space-y-6">
            <EnhancedScanner
              onCapture={handleFileCapture}
              onAnalysisResult={handleLocalAnalysisResult}
              autoStart={false}
              enableLocalAnalysis={localAnalysisEnabled}
              showHeatMap={true}
              width={640}
              height={480}
            />
            
            {/* Analysis Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Analysis Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Real-time Local Analysis</span>
                  <Button
                    variant={localAnalysisEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocalAnalysisEnabled(!localAnalysisEnabled)}
                  >
                    {localAnalysisEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                
                {capturedFile && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">
                        Image captured: {capturedFile.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => performAnalysis(capturedFile)}
                          disabled={isAnalyzing}
                          size="sm"
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Analyze with Backend'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOverlayMode(overlayMode === 'heat' ? 'boxes' : 'heat')}
                          disabled={!analysisResult?.detections?.length}
                        >
                          {overlayMode === 'heat' ? 'Show Boxes' : 'Show Heatmap'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Image with Overlay */}
            {analyzedImageUrl && analysisResult?.detections && analysisResult?.imageSize && (
              <Card>
                <CardHeader>
                  <CardTitle>Analyzed Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative inline-block">
                    <img
                      ref={analyzedImgRef}
                      src={analyzedImageUrl}
                      alt="Analyzed"
                      className="max-h-96 w-auto rounded-lg border shadow-sm"
                      onLoad={() => setImageReady(true)}
                    />
                    {analyzedImgRef.current && imageReady && (
                      <DetectionsOverlay
                        key={`${overlayMode}-${imageReady}`}
                        forImage={analyzedImgRef.current}
                        detections={analysisResult.detections}
                        imageSize={
                          analysisResult.imageSize?.width && analysisResult.imageSize?.height
                            ? analysisResult.imageSize
                            : { width: analyzedImgRef.current.naturalWidth, height: analyzedImgRef.current.naturalHeight }
                        }
                        mode={overlayMode}
                        opacity={0.6}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Concern Overlays Gallery */}
            {analyzedImgRef.current && imageReady && (
              <HeatmapGallery
                imageEl={analyzedImgRef.current}
                detections={analysisResult?.detections}
                imageSize={analysisResult?.imageSize}
                regionScores={analysisResult?.regionScores}
                rednessPct={analysisResult?.redness}
                oilinessPct={analysisResult?.oiliness}
                drynessPct={analysisResult?.dryness}
                poresPct={analysisResult?.pores}
                darkSpotsPct={analysisResult?.darkSpots}
              />
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {analysisResult ? (
              <>
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Overall Skin Health</span>
                      <Badge variant={getBadgeVariant(analysisResult.overallScore)}>
                        {analysisResult.overallScore}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">Skin Type</span>
                        <Badge variant="outline">{analysisResult.skinType}</Badge>
                      </div>
                      
                      {analysisResult.confidence && (
                        <div className="flex items-center justify-between text-sm text-neutral-600">
                          <span>Analysis Confidence</span>
                          <span>{Math.round(analysisResult.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'acne', label: 'Acne', value: analysisResult.acne },
                        { key: 'redness', label: 'Redness', value: analysisResult.redness },
                        { key: 'oiliness', label: 'Oiliness', value: analysisResult.oiliness },
                        { key: 'dryness', label: 'Dryness', value: analysisResult.dryness },
                        { key: 'pores', label: 'Pores', value: analysisResult.pores },
                        { key: 'darkSpots', label: 'Dark Spots', value: analysisResult.darkSpots }
                      ].map(({ key, label, value }) => (
                        <div key={key} className="text-center">
                          <div className="text-sm text-neutral-600">{label}</div>
                          <div className={`text-xl font-bold ${getScoreColor(100 - value)}`}>
                            {value}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${100 - value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Regional Analysis */}
                {analysisResult.regionScores && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Regional Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(analysisResult.regionScores).map(([region, score]) => (
                          score && (
                            <div key={region} className="text-center">
                              <div className="text-sm text-neutral-600 capitalize">
                                {region.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className={`text-lg font-semibold ${getScoreColor(score * 100)}`}>
                                {Math.round(score * 100)}%
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personalized Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm text-green-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Products Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Quick filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Button
                        variant={filters.acneSafeOnly ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, acneSafeOnly: !f.acneSafeOnly }))}
                      >
                        Acne-safe
                      </Button>
                      <Button
                        variant={filters.fragranceFreeOnly ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, fragranceFreeOnly: !f.fragranceFreeOnly }))}
                      >
                        Fragrance-free
                      </Button>
                    </div>

                    {/* Loading skeletons */}
                    {productsLoading && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex gap-3 p-3 border rounded-lg bg-white">
                            <Skeleton className="h-20 w-20 rounded-md" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/5" />
                              <Skeleton className="h-3 w-2/5" />
                              <Skeleton className="h-3 w-4/5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Error / Empty state */}
                    {!productsLoading && productsError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
                        {productsError}
                      </div>
                    )}
                    {!productsLoading && !productsError && products.length === 0 && (
                      <div className="text-sm text-neutral-600 bg-neutral-50 border p-3 rounded-md">
                        No product recommendations available yet.
                      </div>
                    )}

                    {/* Products grid */}
                    {!productsLoading && !productsError && products.length > 0 && (
                      <RecommendedProducts
                        products={products}
                        onProductClick={(p) => {
                          if (!p.productUrl) {
                            toast.info('Product link coming soon.');
                            return;
                          }
                          const win = window.open(p.productUrl, '_blank', 'noopener,noreferrer');
                          if (!win) {
                            toast.error('Could not open product link. Please allow popups.');
                          }
                        }}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => navigate('/dashboard')}>
                        <Download className="h-4 w-4 mr-2" />
                        Save to History
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Share className="h-4 w-4 mr-2" />
                        Share Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Ready for Analysis</h3>
                      <p className="text-neutral-600 mt-1">
                        {localAnalysisEnabled 
                          ? 'Start your camera or upload a photo to begin real-time analysis'
                          : 'Capture or upload a photo to analyze your skin'
                        }
                      </p>
                    </div>
                    
                    {!localAnalysisEnabled && (
                      <Button
                        onClick={() => setLocalAnalysisEnabled(true)}
                        variant="outline"
                      >
                        Enable Real-time Analysis
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
