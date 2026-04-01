"use client";

import { useCallback, useContext, useState, useRef, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { AppContext, AppStep } from '@/context/app-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileWarning, Camera, VideoOff, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadStep() {
  const { setOriginalImage, setStep } = useContext(AppContext);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);

    if (fileRejections.length > 0) {
      const message = fileRejections[0].errors[0].message;
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: message,
      });
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
       if (!file.type.startsWith('image/')) {
        const message = 'Invalid file type. Please upload an image.';
        setError(message);
        toast({ variant: 'destructive', title: 'Upload Error', description: message });
        return;
      }

      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const dataUri = e.target?.result as string;
        const img = document.createElement('img');
        img.onload = () => {
          setOriginalImage({
            file,
            dataUri,
            width: img.width,
            height: img.height,
          });
          setStep(AppStep.EDIT);
        };
        img.src = dataUri;
      };

      reader.readAsDataURL(file);
    }
  }, [setOriginalImage, setStep, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    multiple: false,
    accept: {
      'image/*': []
    }
  });

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if(videoRef.current) videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = async (mode: 'user' | 'environment') => {
    if (hasCameraPermission === false) {
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this app.',
      });
      return;
    }
    
    stopStream();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      setStream(newStream);
      setHasCameraPermission(true);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if ((error as Error).name === 'NotAllowedError') {
          setHasCameraPermission(false);
      }
      setIsCameraActive(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Error',
        description: 'Could not access the selected camera. It might be in use or not available.',
      });
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleTabChange = (value: string) => {
    if (value === 'camera') {
      startCamera(facingMode);
    } else {
      stopStream();
      setIsCameraActive(false);
    }
  };

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUri = canvas.toDataURL('image/jpeg', 0.9);

      fetch(dataUri)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          setOriginalImage({
            file,
            dataUri,
            width: video.videoWidth,
            height: video.videoHeight,
          });
          setStep(AppStep.EDIT);
        });
    }
  };
  
  useEffect(() => {
    const checkForMultipleCameras = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                if (videoInputs.length > 1) {
                    setHasMultipleCameras(true);
                }
            } catch (err) {
                console.error("Error checking for multiple cameras:", err);
            }
        }
    };
    checkForMultipleCameras();

    return () => {
      stopStream();
    };
  }, [stopStream]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-500">
      <div className="text-center md:text-left">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground" style={{ textShadow: '0 0 20px rgba(hsl(var(--primary)), 0.3)'}}>
            Create Perfect Passport Photos in Seconds
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground">
            Upload your photo, or use your camera. Our AI handles the background, enhancement, and compliance checks automatically.
          </p>
      </div>
      <Card className="card-glow bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload"><UploadCloud className="mr-2" /> Upload File</TabsTrigger>
              <TabsTrigger value="camera"><Camera className="mr-2" /> Use Camera</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <div
                {...getRootProps()}
                className={`mt-4 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                  ${error ? 'border-destructive' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="text-center">
                    <UploadCloud className={`mx-auto h-12 w-12 ${error ? 'text-destructive' : 'text-primary'}`} />
                    <p className="mt-4 font-semibold">
                      {isDragActive ? 'Drop the file here...' : 'Drag & drop a photo or click to select'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Any image format, up to 10MB.</p>
                    {error && (
                        <div className="mt-4 text-sm text-destructive flex items-center justify-center gap-2">
                            <FileWarning className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="camera">
                <div className="mt-4 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    {!isCameraActive && hasCameraPermission !== false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <VideoOff className="h-12 w-12" />
                        <p className="mt-2">Camera is off</p>
                      </div>
                    )}
                    {isCameraActive && hasMultipleCameras && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 z-10 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white"
                        onClick={toggleCamera}
                        aria-label="Switch camera"
                      >
                        <SwitchCamera />
                      </Button>
                    )}
                  </div>
                  
                  {hasCameraPermission === false && (
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Please allow camera access in your browser settings to use this feature.
                        </AlertDescription>
                      </Alert>
                  )}
                  
                  <Button onClick={takePicture} disabled={!isCameraActive} className="w-full btn-glow">
                    <Camera className="mr-2" /> Take Photo
                  </Button>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
