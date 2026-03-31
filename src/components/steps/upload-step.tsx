"use client";

import { useCallback, useContext, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { AppContext, AppStep } from '@/context/app-context';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { UploadCloud, FileWarning, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;

export default function UploadStep() {
  const { setOriginalImage, setStep } = useContext(AppContext);
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const dataUri = e.target?.result as string;
        const img = document.createElement('img');
        img.onload = () => {
          if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
            const message = `Image is too small. Minimum dimensions are ${MIN_WIDTH}x${MIN_HEIGHT}px.`;
            setError(message);
            toast({ variant: 'destructive', title: 'Upload Error', description: message });
            return;
          }
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
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: MAX_SIZE,
    multiple: false,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in duration-500">
        <div className="text-center md:text-left">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Create Perfect Passport Photos in Seconds
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Upload your photo and let our AI handle the background, enhancement, and compliance checks automatically.
            </p>
            <div className="mt-8">
                <Button size="lg" onClick={() => document.querySelector<HTMLElement>('input[type="file"]')?.click()}>
                    Upload Your Photo <ArrowRight className="ml-2"/>
                </Button>
            </div>
        </div>
      <Card>
        <CardContent className="p-4">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
              ${error ? 'border-destructive' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
                <UploadCloud className={`mx-auto h-12 w-12 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className="mt-4 font-semibold">
                  {isDragActive ? 'Drop the file here...' : 'Drag & drop a photo or click to select'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG, or WEBP. Max 10MB.</p>
                {error && (
                    <div className="mt-4 text-sm text-destructive flex items-center justify-center gap-2">
                        <FileWarning className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
