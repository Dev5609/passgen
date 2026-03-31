"use client";

import "cropperjs/dist/cropper.css";
import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import { AppContext, AppStep } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PASSPORT_STANDARDS } from "@/lib/constants";
import { processImage, checkCompliance } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Info, Loader2, ZoomIn, ZoomOut, Move, ArrowRight, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ComplianceResult = Awaited<ReturnType<typeof checkCompliance>>;

export default function EditStep() {
  const { originalImage, setProcessedImage, setCroppedImage, setStep, standard, setStandardKey } = useContext(AppContext);
  const { toast } = useToast();
  const cropperRef = useRef<ReactCropperElement>(null);
  
  const [loadingState, setLoadingState] = useState<{ message: string | null }>({ message: null });
  const [processedImgSrc, setProcessedImgSrc] = useState<string | null>(null);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);

  const handleImageProcessing = useCallback(async () => {
    if (!originalImage) return;

    setLoadingState({ message: "Removing background..." });
    const bgResult = await processImage({ photoDataUri: originalImage.dataUri });
    
    if (bgResult.success && bgResult.processedImageUri) {
      setLoadingState({ message: "Enhancing quality..." });
      // The processImage action now handles both steps
      setProcessedImgSrc(bgResult.processedImageUri);
      setProcessedImage(bgResult.processedImageUri);
      setLoadingState({ message: null });
    } else {
      toast({ variant: "destructive", title: "Processing Failed", description: bgResult.error });
      setLoadingState({ message: "Processing failed. Please try again." });
    }
  }, [originalImage, setProcessedImage, toast]);
  
  const handleComplianceCheck = useCallback(async () => {
    if (!processedImgSrc || !standard) return;
    
    setIsComplianceLoading(true);
    const result = await checkCompliance({ photoDataUri: processedImgSrc, country: standard.key });
    
    if (result.success) {
      setComplianceResult(result);
      if (result.autoCropSuggestion && cropperRef.current) {
        const cropper = cropperRef.current.cropper;
        const imageData = cropper.getImageData();
        const { xRatio, yRatio, widthRatio, heightRatio } = result.autoCropSuggestion;
        cropper.setData({
          x: xRatio * imageData.naturalWidth,
          y: yRatio * imageData.naturalHeight,
          width: widthRatio * imageData.naturalWidth,
          height: heightRatio * imageData.naturalHeight,
        });
      }
    } else {
      toast({ variant: "destructive", title: "Compliance Check Failed", description: result.error });
    }
    setIsComplianceLoading(false);
  }, [processedImgSrc, standard, toast]);

  useEffect(() => { handleImageProcessing(); }, [handleImageProcessing]);
  useEffect(() => { handleComplianceCheck(); }, [processedImgSrc, standard, handleComplianceCheck]);

  const onCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (typeof cropper !== "undefined") {
        // Debounced or on-demand update could be better here
    }
  };

  const handleNext = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 1000, // higher resolution for quality
        imageSmoothingQuality: 'high',
      });
      if (croppedCanvas) {
        setCroppedImage(croppedCanvas.toDataURL());
        setStep(AppStep.EXPORT);
      }
    }
  };
  
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground">{loadingState.message}</p>
      <p className="text-sm text-muted-foreground">Our AI is working its magic. Please wait a moment.</p>
      <Skeleton className="h-[400px] w-full max-w-sm rounded-lg" />
    </div>
  );

  return (
    <Card className="w-full animate-in fade-in duration-500 card-glow bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Adjust & Crop Your Photo</CardTitle>
        <CardDescription>Select your passport standard and fine-tune the crop. Our AI will guide you.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingState.message ? renderLoading() : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted">
                {processedImgSrc && (
                  <Cropper
                    ref={cropperRef}
                    src={processedImgSrc}
                    style={{ height: '100%', width: '100%' }}
                    aspectRatio={standard.width_mm / standard.height_mm}
                    guides={true}
                    viewMode={1}
                    dragMode="move"
                    responsive={true}
                    autoCrop={true}
                    checkOrientation={false}
                    crop={onCrop}
                    className="bg-muted"
                  />
                )}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
                <Button variant="ghost" size="icon" onClick={() => cropperRef.current?.cropper.zoom(0.1)}><ZoomIn/></Button>
                <Button variant="ghost" size="icon" onClick={() => cropperRef.current?.cropper.zoom(-0.1)}><ZoomOut/></Button>
                <Button variant="ghost" size="icon" onClick={() => cropperRef.current?.cropper.setDragMode('move')}><Move/></Button>
                <Button variant="ghost" size="icon" onClick={() => cropperRef.current?.cropper.setDragMode('crop')}><ImageIcon/></Button>
              </div>
            </div>

            <div className="flex flex-col space-y-6">
              <div>
                <Label htmlFor="country-select" className="text-base font-semibold">Passport Standard</Label>
                <Select value={standard.key} onValueChange={(val) => setStandardKey(val)}>
                  <SelectTrigger id="country-select" className="mt-2 w-full text-base">
                    <SelectValue placeholder="Select a country standard" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PASSPORT_STANDARDS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">AI Compliance Check</h3>
                    {isComplianceLoading && <Loader2 className="h-4 w-4 animate-spin"/>}
                </div>
                {!complianceResult || !complianceResult.faceDetected ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <p>No face detected or error.</p>
                    </div>
                ) : (
                    <ul className="space-y-2 text-sm">
                    {complianceResult.complianceFeedback.map((msg, i) => (
                        <li key={i} className={`flex items-start gap-2 ${msg.includes('meet') ? 'text-green-400' : 'text-amber-400'}`}>
                            {msg.includes('meet') ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                            <span>{msg}</span>
                        </li>
                    ))}
                    </ul>
                )}
              </div>
              <Button size="lg" className="w-full btn-glow" onClick={handleNext}>
                Next Step <ArrowRight className="ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
