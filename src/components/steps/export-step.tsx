"use client";

import { useState, useContext } from "react";
import { AppContext, AppStep } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PAPER_SIZES, COPY_OPTIONS } from "@/lib/constants";
import { generateDownloadables } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";

type Format = 'pdf' | 'png' | 'zip';

export default function ExportStep() {
  const { croppedImage, setGeneratedFiles, setGeneratedPngSheet, standard, setPaperSize, setStep } = useContext(AppContext);
  const [copies, setCopies] = useState<string>("6");
  const [paper, setPaper] = useState<keyof typeof PAPER_SIZES>("a4");
  const [addCuttingGuides, setAddCuttingGuides] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (format: Format) => {
    if (!croppedImage || !standard) return;
    setIsLoading(true);

    const paperDetails = PAPER_SIZES[paper];
    setPaperSize(paperDetails);

    if (format === 'png') {
        // Client-side PNG generation
        generatePngSheet(paperDetails);
    } else {
        const result = await generateDownloadables({
            croppedImageUri: croppedImage,
            standardKey: standard.key,
            paperDetails,
            copies: parseInt(copies),
            addCuttingGuides,
            format,
        });
    
        if (result.success && result.file) {
            const url = `data:${result.file.mimeType};base64,${result.file.data}`;
            setGeneratedFiles(prev => [...(prev || []), { url, fileName: result.file.fileName, mimeType: result.file.mimeType }]);
        } else {
            toast({ variant: "destructive", title: "Generation Failed", description: result.error });
        }
    }
    
    // Check if all formats are generated, then move to next step
    // This is a simplified logic. A real app might handle this more gracefully.
    if (format === 'pdf') {
        // Assuming PDF is the last main format, then move.
        setTimeout(() => {
          setIsLoading(false);
          setStep(AppStep.DOWNLOAD);
        }, 1000); // Give a moment for state to update
    } else {
      setIsLoading(false);
    }
  };
  
  const generatePngSheet = (paperDetails: typeof PAPER_SIZES[keyof typeof PAPER_SIZES]) => {
      const MM_TO_PX = 3.7795275591; // at 96 DPI
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const paperWidthPx = paperDetails.width_mm * MM_TO_PX;
      const paperHeightPx = paperDetails.height_mm * MM_TO_PX;
      canvas.width = paperWidthPx;
      canvas.height = paperHeightPx;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.onload = () => {
          const photoWidthPx = standard.width_mm * MM_TO_PX;
          const photoHeightPx = standard.height_mm * MM_TO_PX;
          const marginPx = 10 * MM_TO_PX;

          const availableWidth = paperWidthPx - 2 * marginPx;
          const availableHeight = paperHeightPx - 2 * marginPx;

          const photosPerRow = Math.floor(availableWidth / photoWidthPx);
          const photosPerCol = Math.floor(availableHeight / photoHeightPx);
          
          let copiesPlaced = 0;
          for (let row = 0; row < photosPerCol && copiesPlaced < parseInt(copies); row++) {
              for (let col = 0; col < photosPerRow && copiesPlaced < parseInt(copies); col++) {
                  const x = marginPx + col * photoWidthPx;
                  const y = marginPx + row * photoHeightPx;
                  ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx);
                  copiesPlaced++;
              }
          }
          setGeneratedPngSheet(canvas.toDataURL('image/png'));
          toast({ title: "PNG Sheet Generated", description: "You can now download the PNG sheet." });
      };
      img.src = croppedImage!;
  };

  const handleGenerateAll = async () => {
      if (!croppedImage || !standard) return;
      setIsLoading(true);
      
      const paperDetails = PAPER_SIZES[paper];
      setPaperSize(paperDetails);

      // Generate PDF and ZIP via server action
      const pdfResult = await generateDownloadables({ croppedImageUri: croppedImage, standardKey: standard.key, paperDetails, copies: parseInt(copies), addCuttingGuides, format: 'pdf' });
      const zipResult = await generateDownloadables({ croppedImageUri: croppedImage, standardKey: standard.key, paperDetails, copies: parseInt(copies), addCuttingGuides, format: 'zip' });

      const newFiles = [];
      if (pdfResult.success && pdfResult.file) {
          newFiles.push({ url: `data:${pdfResult.file.mimeType};base64,${pdfResult.file.data}`, fileName: pdfResult.file.fileName, mimeType: pdfResult.file.mimeType });
      } else {
          toast({ variant: "destructive", title: "PDF Generation Failed", description: pdfResult.error });
      }
      if (zipResult.success && zipResult.file) {
          newFiles.push({ url: `data:${zipResult.file.mimeType};base64,${zipResult.file.data}`, fileName: zipResult.file.fileName, mimeType: zipResult.file.mimeType });
      } else {
          toast({ variant: "destructive", title: "ZIP Generation Failed", description: zipResult.error });
      }
      
      setGeneratedFiles(newFiles);
      generatePngSheet(paperDetails); // Generate PNG on client

      setIsLoading(false);
      setStep(AppStep.DOWNLOAD);
  }

  return (
    <Card className="w-full animate-in fade-in duration-500">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Configure Your Print Sheet</CardTitle>
        <CardDescription>Choose how you want to arrange and save your passport photos.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex items-center justify-center rounded-lg border bg-muted p-4">
          {croppedImage ? (
            <img src={croppedImage} alt="Cropped passport" className="max-h-[400px] rounded-md shadow-lg" />
          ) : (
            <div className="h-full w-full bg-gray-200 animate-pulse rounded-md" />
          )}
        </div>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="copies-select">Number of Copies</Label>
              <Select value={copies} onValueChange={setCopies}>
                <SelectTrigger id="copies-select" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COPY_OPTIONS.map(opt => <SelectItem key={opt} value={String(opt)}>{opt} Copies</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paper-select">Paper Size</Label>
              <Select value={paper} onValueChange={(val) => setPaper(val as keyof typeof PAPER_SIZES)}>
                <SelectTrigger id="paper-select" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPER_SIZES).map(([key, value]) => <SelectItem key={key} value={key}>{value.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="cutting-guides" className="text-base">Add Cutting Guides</Label>
            <Switch id="cutting-guides" checked={addCuttingGuides} onCheckedChange={setAddCuttingGuides} />
          </div>
          <div className="space-y-3 pt-4">
             <Button size="lg" className="w-full" onClick={handleGenerateAll} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2" />}
              Generate All Formats
            </Button>
            <p className="text-center text-xs text-muted-foreground">Generates PDF, PNG sheet, and a ZIP file.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
