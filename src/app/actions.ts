"use server";

import { z } from "zod";
import { aiEnhancedPhotoQuality } from "@/ai/flows/ai-enhanced-photo-quality";
import { aiGuidedPassportCompliance } from "@/ai/flows/ai-guided-passport-compliance-flow";
import { PASSPORT_STANDARDS, PaperSizeDetails } from "@/lib/constants";
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import JSZip from "jszip";
import { removeBackground } from "@/lib/remove-bg";

const MM_TO_PT = 2.83465;

const processImageSchema = z.object({
  photoDataUri: z.string().startsWith("data:image/"),
});

export async function processImage(values: z.infer<typeof processImageSchema>) {
  const validatedValues = processImageSchema.safeParse(values);
  if (!validatedValues.success) {
    return { success: false, error: "Invalid input for image processing." };
  }

  const { photoDataUri } = validatedValues.data;
  let currentImageUri = photoDataUri;

  // If no keys are provided at all, just return the original image.
  if (!process.env.REMOVE_BG_API_KEY && !process.env.OPENAI_API_KEY) {
      console.warn("No API keys found for image processing. Returning original image.");
      return {
          success: true,
          processedImageUri: photoDataUri,
      };
  }

  try {
    // Step 1: Remove background using remove.bg if configured
    if (process.env.REMOVE_BG_API_KEY) {
      console.log("Attempting background removal with remove.bg...");
      currentImageUri = await removeBackground(currentImageUri);
    } else {
      console.warn("REMOVE_BG_API_KEY not found. Skipping background removal.");
    }

    // Step 2: Enhance quality using OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("Attempting photo enhancement with OpenAI...");
        const enhancementResult = await aiEnhancedPhotoQuality({
          photoDataUri: currentImageUri,
        });
        currentImageUri = enhancementResult.enhancedPhotoDataUri || currentImageUri;
      } catch (enhancementError) {
        console.error("OpenAI photo enhancement failed:", enhancementError);
        console.warn("Skipping photo enhancement due to an error, but proceeding with the image from the previous step.");
      }
    } else {
      console.warn("OPENAI_API_KEY not found, skipping AI photo enhancement.");
    }

    return {
      success: true,
      processedImageUri: currentImageUri,
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

        if (!process.env.OPENAI_API_KEY) {
            console.warn("OPENAI_API_KEY not found, skipping AI compliance check.");
            return {
                success: true,
                faceDetected: true,
                complianceFeedback: ["AI compliance check skipped: API key missing. Please manually verify the photo against the guidelines."],
                autoCropSuggestion: null,
                eyeLineActualFromTopRatio: null,
                headHeightActualRatio: null,
            };
        }

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

    const xSpacing = photosPerRow > 1 ? (availableWidth - photosPerRow * photoWidthPt) / (photosPerRow - 1) : 0;
    const ySpacing = photosPerCol > 1 ? (availableHeight - photosPerCol * photoHeightPt) / (photosPerCol - 1) : 0;

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
