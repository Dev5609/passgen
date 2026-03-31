"use client";

import { useContext, useEffect, useRef } from "react";
import { AppContext } from "@/context/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Repeat } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from 'next/image';

export default function DownloadStep() {
  const { generatedFiles, reset, generatedPngSheet, standard, paperSize } = useContext(AppContext);
  const finalImage = generatedPngSheet || generatedFiles?.find(f => f.mimeType.startsWith('image/'))?.url;
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const pdfFile = generatedFiles?.find(f => f.mimeType === 'application/pdf');
  const zipFile = generatedFiles?.find(f => f.mimeType === 'application/zip');

  return (
    <Card className="w-full animate-in fade-in duration-500">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Download Your Photos</CardTitle>
        <CardDescription>Your passport photos are ready. Download them in your preferred format.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card-foreground/5 p-4">
            <h3 className="mb-4 text-lg font-medium">Print Sheet Preview</h3>
            <div className="relative w-full overflow-hidden rounded-lg shadow-lg" style={{ aspectRatio: `${paperSize.width_mm}/${paperSize.height_mm}` }}>
              {finalImage ? (
                <Image
                  src={finalImage}
                  alt="Generated passport photo sheet"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="bg-white"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                    <p className="text-muted-foreground">No preview available.</p>
                </div>
              )}
            </div>
            
        </div>
        <div className="flex flex-col justify-center space-y-4">
          <h3 className="text-center text-lg font-medium md:text-left">Your Download Options</h3>
          {pdfFile && (
            <Button size="lg" onClick={() => downloadFile(pdfFile.url, pdfFile.fileName)}>
              <Download className="mr-2" />
              Download PDF Sheet
            </Button>
          )}
          {generatedPngSheet && (
             <Button size="lg" variant="secondary" onClick={() => downloadFile(generatedPngSheet, `PassGen_Sheet_${standard.name.replace(/\s/g, '_')}.png`)}>
               <Download className="mr-2" />
               Download PNG Sheet
            </Button>
          )}
          {zipFile && (
            <Button size="lg" variant="secondary" onClick={() => downloadFile(zipFile.url, zipFile.fileName)}>
              <Download className="mr-2" />
              Download Single Photo (ZIP)
            </Button>
          )}

          <div className="pt-4">
             <Button size="lg" variant="outline" className="w-full" onClick={reset}>
               <Repeat className="mr-2" />
               Start Over
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
