import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCapture: (imageData: string) => void;
  onAnalysisComplete: (wineData: any) => void;
}

export default function CameraCapture({ isOpen, onClose, onImageCapture, onAnalysisComplete }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraError("Unable to access camera. Please ensure you have granted camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    onImageCapture(imageData);
    
    // Stop camera after capture
    stopCamera();
  }, [stopCamera, onImageCapture]);

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    try {
      // Extract base64 data without data URL prefix
      const base64Data = capturedImage.split(',')[1];
      
      const response = await fetch('/api/analyze-wine-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze wine label');
      }

      const analysisResult = await response.json();
      
      if (analysisResult.success) {
        // Process grapes array into a string if it exists
        const processedWineData = { 
          ...analysisResult.wineData,
          grapes: analysisResult.wineData?.grapes && Array.isArray(analysisResult.wineData.grapes) 
            ? analysisResult.wineData.grapes.join(', ') 
            : analysisResult.wineData?.grapes
        };
        onAnalysisComplete(processedWineData);
        toast({
          title: "Wine label recognized!",
          description: "Wine details have been automatically filled in.",
        });
        onClose();
      } else {
        toast({
          title: "Recognition failed",
          description: analysisResult.message || "Could not recognize wine label. Please try again or enter details manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis error",
        description: "Failed to analyze wine label. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !stream && !capturedImage) {
      startCamera();
    }
  }, [isOpen, stream, capturedImage, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Wine Label Recognition
          </DialogTitle>
          <DialogDescription>
            Capture a photo of your wine label for automatic wine information extraction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cameraError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <div className="text-red-600 mb-2">{cameraError}</div>
                <Button onClick={startCamera} variant="outline" size="sm">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={capturedImage} 
                  alt="Captured wine label" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={retakePhoto} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </Button>
                <Button 
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze Label"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {stream && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button 
                      onClick={captureImage}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black"
                    >
                      <Camera className="w-6 h-6" />
                    </Button>
                  </div>
                )}
              </div>
              
              {!stream && !cameraError && (
                <div className="text-center text-gray-500">
                  Starting camera...
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}