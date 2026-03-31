"use server";

import { z } from "zod";
import { aiBackgroundReplacement } from "@/ai/flows/ai-background-replacement-flow";
import { aiEnhancedPhotoQuality } from "@/ai/flows/ai-enhanced-photo-quality";
import { aiGuidedPassportCompliance } from "@/ai/flows/ai-guided-passport-compliance-flow";
import { PASSPORT_STANDARDS, PaperSizeDetails } from "@/lib/constants";
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import JSZip from "jszip";

const MM_TO_PT = 2.83465;

const processImageSchema = z.object({
  photoDataUri: z.string().startsWith("data:image/"),
});

export async function processImage(values: z.infer<typeof processImageSchema>) {
  const validatedValues = processImageSchema.safeParse(values);
  if (!validatedValues.success) {
    throw new Error("Invalid input for image processing");
  }

  try {
    const { photoDataUri } = validatedValues.data;
    
    // Step 1: Remove background
    const bgRemovalResult = await aiBackgroundReplacement({ photoDataUri });

    if (!bgRemovalResult.processedPhotoDataUri) {
      throw new Error("AI background replacement failed.");
    }

    // Step 2: Enhance quality
    const enhancementResult = await aiEnhancedPhotoQuality({
      photoDataUri: bgRemovalResult.processedPhotoDataUri,
    });
    
    if (!enhancementResult.enhancedPhotoDataUri) {
        throw new Error("AI photo enhancement failed.");
    }

    return {
      success: true,
      processedImageUri: enhancementResult.enhancedPhotoDataUri,
    };
  } catch (error) {
    console.error("Image processing pipeline failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image processing.";
    return { success: false, error: errorMessage };
  }
}


const complianceSchema = z.object({
    photoDataUri: z.string().startsWith("data:image/"),
    country: z.nativeEnum(Object.keys(PASSPORT_STANDARDS)),
});

export async function checkCompliance(values: z.infer<typeof complianceSchema>) {
    const validatedValues = complianceSchema.safeParse(values);
    if (!validatedValues.success) {
        throw new Error("Invalid input for compliance check");
    }

    try {
        const { photoDataUri, country } = validatedValues.data;
        const standards = PASSPORT_STANDARDS[country as keyof typeof PASSPORT_STANDARDS];

        const complianceResult = await aiGuidedPassportCompliance({
            photoDataUri,
            countryStandards: {
                minHeadHeightRatio: standards.rules.minHeadHeightRatio,
                maxHeadHeightRatio: standards.rules.maxHeadHeightRatio,
                eyeLineFromTopRatio: standards.rules.eyeLineFromTopRatio,
                targetAspectRatio: standards.rules.targetAspectRatio,
            }
        });

        return { success: true, ...complianceResult };
    } catch (error) {
        console.error("Compliance check failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during compliance check.";
        return { success: false, error: errorMessage };
    }
}

const generationSchema = z.object({
    croppedImageUri: z.string().startsWith("data:image/"),
    standardKey: z.nativeEnum(Object.keys(PASSPORT_STANDARDS)),
    paperDetails: z.object({
        width_mm: z.number(),
        height_mm: z.number(),
        name: z.string()
    }),
    copies: z.number().int().min(1),
    addCuttingGuides: z.boolean(),
});

type GenerationInput = z.infer<typeof generationSchema>;

async function generatePdf(input: GenerationInput): Promise<string> {
    const { croppedImageUri, standardKey, paperDetails, copies, addCuttingGuides } = input;
    const standard = PASSPORT_STANDARDS[standardKey as keyof typeof PASSPORT_STANDARDS];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([paperDetails.width_mm * MM_TO_PT, paperDetails.height_mm * MM_TO_PT]);

    const imageBytes = Buffer.from(croppedImageUri.split(",")[1], "base64");
    const image = croppedImageUri.startsWith('data:image/png') 
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    const photoWidthPt = standard.width_mm * MM_TO_PT;
    const photoHeightPt = standard.height_mm * MM_TO_PT;
    const marginPt = 10 * MM_TO_PT; // 1cm margin

    const availableWidth = page.getWidth() - 2 * marginPt;
    const availableHeight = page.getHeight() - 2 * marginPt;

    const photosPerRow = Math.floor(availableWidth / photoWidthPt);
    const photosPerCol = Math.floor(availableHeight / photoHeightPt);

    const xSpacing = (availableWidth - photosPerRow * photoWidthPt) / (photosPerRow > 1 ? photosPerRow - 1 : 1);
    const ySpacing = (availableHeight - photosPerCol * photoHeightPt) / (photosPerCol > 1 ? photosPerCol - 1 : 1);

    let copiesPlaced = 0;
    for (let row = 0; row < photosPerCol && copiesPlaced < copies; row++) {
        for (let col = 0; col < photosPerRow && copiesPlaced < copies; col++) {
            const x = marginPt + col * (photoWidthPt + xSpacing);
            const y = page.getHeight() - marginPt - (row + 1) * photoHeightPt - row * ySpacing;
            
            page.drawImage(image, {
                x,
                y,
                width: photoWidthPt,
                height: photoHeightPt,
            });

            if (addCuttingGuides) {
                const guideColor = rgb(0.8, 0.8, 0.8);
                const guideWidth = 0.5;
                // Vertical lines
                page.drawLine({ start: { x: x, y: 0 }, end: { x: x, y: page.getHeight() }, color: guideColor, thickness: guideWidth, dashArray: [5, 5] });
                page.drawLine({ start: { x: x + photoWidthPt, y: 0 }, end: { x: x + photoWidthPt, y: page.getHeight() }, color: guideColor, thickness: guideWidth, dashArray: [5, 5] });
                // Horizontal lines
                page.drawLine({ start: { x: 0, y: y }, end: { x: page.getWidth(), y: y }, color: guideColor, thickness: guideWidth, dashArray: [5, 5] });
                page.drawLine({ start: { x: 0, y: y + photoHeightPt }, end: { x: page.getWidth(), y: y + photoHeightPt }, color: guideColor, thickness: guideWidth, dashArray: [5, 5] });
            }
            copiesPlaced++;
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

async function generateZip(input: GenerationInput): Promise<string> {
    const { croppedImageUri, standardKey } = input;
    const standard = PASSPORT_STANDARDS[standardKey as keyof typeof PASSPORT_STANDARDS];
    const imageBytes = Buffer.from(croppedImageUri.split(",")[1], "base64");
    
    const zip = new JSZip();
    const fileExtension = croppedImageUri.startsWith('data:image/png') ? 'png' : 'jpg';
    zip.file(`passport_photo_${standard.width_mm}x${standard.height_mm}.${fileExtension}`, imageBytes);

    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
    return zipBytes.toString('base64');
}


export async function generateDownloadables(values: z.infer<typeof generationSchema> & { format: 'pdf' | 'zip' }) {
     const validatedValues = generationSchema.extend({ format: z.enum(['pdf', 'zip']) }).safeParse(values);
    if (!validatedValues.success) {
        throw new Error("Invalid input for file generation");
    }

    try {
        const { format, ...input } = validatedValues.data;
        let fileData: string;
        let mimeType: string;
        let fileName: string;
        
        const standard = PASSPORT_STANDARDS[input.standardKey as keyof typeof PASSPORT_STANDARDS];

        if (format === 'pdf') {
            fileData = await generatePdf(input);
            mimeType = 'application/pdf';
            fileName = `PassGen_${input.copies}-copies_${standard.name.replace(/\s/g, '_')}_on_${input.paperDetails.name}.pdf`;
        } else { // zip
            fileData = await generateZip(input);
            mimeType = 'application/zip';
            fileName = `PassGen_photo_${standard.width_mm}x${standard.height_mm}.zip`;
        }

        return {
            success: true,
            file: {
                data: fileData,
                mimeType,
                fileName,
            }
        };

    } catch (error) {
        console.error("File generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during file generation.";
        return { success: false, error: errorMessage };
    }
}
