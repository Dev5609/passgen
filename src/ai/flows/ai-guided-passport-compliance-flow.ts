'use server';
/**
 * @fileOverview This file implements a Genkit flow for AI-guided passport photo compliance checks.
 *
 * - aiGuidedPassportCompliance - A function that analyzes a photo for passport compliance.
 * - AiGuidedPassportComplianceInput - The input type for the aiGuidedPassportCompliance function.
 * - AiGuidedPassportComplianceOutput - The return type for the aiGuidedPassportCompliance function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the compliance check
const AiGuidedPassportComplianceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  countryStandards: z.object({
    minHeadHeightRatio: z.number().min(0).max(1).describe('Minimum head height as a ratio of the total photo height (0.0 to 1.0).'),
    maxHeadHeightRatio: z.number().min(0).max(1).describe('Maximum head height as a ratio of the total photo height (0.0 to 1.0).'),
    eyeLineFromTopRatio: z.number().min(0).max(1).describe('Expected eye line position as a ratio from the top of the photo (0.0 to 1.0).'),
    targetAspectRatio: z.string().optional().describe('Optional target aspect ratio for the crop suggestion (e.g., "1:1" for 2x2 inch, "7:9" for 35x45mm).'),
  }).describe('Country-specific passport photo standards for head size and eye line.'),
});
export type AiGuidedPassportComplianceInput = z.infer<typeof AiGuidedPassportComplianceInputSchema>;

// Output schema for the compliance feedback and auto-crop suggestion
const AiGuidedPassportComplianceOutputSchema = z.object({
  faceDetected: z.boolean().describe('Whether a face was successfully detected in the photo.'),
  complianceFeedback: z.array(z.string()).describe('A list of compliance issues or confirmations.'),
  autoCropSuggestion: z.object({
    xRatio: z.number().min(0).max(1).describe('X coordinate of the top-left corner of the suggested crop box, as a ratio of image width (0.0 to 1.0).'),
    yRatio: z.number().min(0).max(1).describe('Y coordinate of the top-left corner of the suggested crop box, as a ratio of image height (0.0 to 1.0).'),
    widthRatio: z.number().min(0).max(1).describe('Width of the suggested crop box, as a ratio of image width (0.0 to 1.0).'),
    heightRatio: z.number().min(0).max(1).describe('Height of the suggested crop box, as a ratio of image height (0.0 to 1.0).'),
  }).nullable().describe('Suggested crop box coordinates (as ratios) to achieve compliance, or null if no face detected.'),
  eyeLineActualFromTopRatio: z.number().nullable().describe('Actual eye line position as a ratio from the top of the photo (0.0 to 1.0), or null if no face detected.'),
  headHeightActualRatio: z.number().nullable().describe('Actual head height (from top of head to chin) as a ratio of the total photo height (0.0 to 1.0), or null if no face detected.'),
});
export type AiGuidedPassportComplianceOutput = z.infer<typeof AiGuidedPassportComplianceOutputSchema>;

// Wrapper function to call the Genkit flow
export async function aiGuidedPassportCompliance(
  input: AiGuidedPassportComplianceInput
): Promise<AiGuidedPassportComplianceOutput> {
  return aiGuidedPassportComplianceFlow(input);
}

// Define the Genkit prompt
const aiGuidedPassportCompliancePrompt = ai.definePrompt({
  name: 'aiGuidedPassportCompliancePrompt',
  input: { schema: AiGuidedPassportComplianceInputSchema },
  output: { schema: AiGuidedPassportComplianceOutputSchema },
  prompt: `You are an expert in passport photo compliance. Your task is to analyze the provided photo and ensure it meets specific country standards for passport photos.
You need to perform the following steps:
1.  **Detect Facial Features**: Identify the bounding box of the face, the coordinates of the left eye, right eye, top of the head, and chin. These coordinates should be relative to the image dimensions (0.0 to 1.0).
2.  **Calculate Ratios**: Using the detected features, calculate the following:
    *   Actual eye line position as a ratio from the top of the photo (0.0 to 1.0).
    *   Actual head height (from top of head to chin) as a ratio of the total photo height (0.0 to 1.0).
3.  **Compare with Standards**: Compare the calculated actual ratios against the provided 'countryStandards'.
    *   Expected minimum head height ratio: {{{countryStandards.minHeadHeightRatio}}}
    *   Expected maximum head height ratio: {{{countryStandards.maxHeadHeightRatio}}}
    *   Expected eye line from top ratio: {{{countryStandards.eyeLineFromTopRatio}}}
    *   If a targetAspectRatio is provided (e.g., "1:1" or "7:9"), consider it for crop suggestions.
4.  **Generate Feedback**: Provide clear feedback on whether the photo is compliant or not. List any specific issues found (e.g., "Head is too small", "Eye line is too high"). If compliant, state "Photo meets compliance standards."
5.  **Suggest Auto-Crop**: If a face is detected, suggest an optimal crop box that centers the face and attempts to meet the eye line and head height requirements. The crop box coordinates (xRatio, yRatio, widthRatio, heightRatio) must be ratios relative to the original image dimensions (0.0 to 1.0). The suggested crop should maintain an aspect ratio as close as possible to the targetAspectRatio (if provided) or a common passport photo aspect ratio (e.g., 7:9 or 1:1) while prioritizing correct head height and eye line placement. The center of the eyes should ideally be at the 'eyeLineFromTopRatio' within the cropped image.

Your response MUST be a JSON object conforming to the following structure:
{{jsonSchema AiGuidedPassportComplianceOutputSchema}}

Photo: {{media url=photoDataUri}}
`,
});

// Define the Genkit flow
const aiGuidedPassportComplianceFlow = ai.defineFlow(
  {
    name: 'aiGuidedPassportComplianceFlow',
    inputSchema: AiGuidedPassportComplianceInputSchema,
    outputSchema: AiGuidedPassportComplianceOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await aiGuidedPassportCompliancePrompt(input, {
        model: 'googleai/gemini-2.5-flash-image', // Use the image-capable model for visual analysis
        // Additional safety settings can be added here if needed
      });

      if (!output) {
        throw new Error('AI model did not return any output.');
      }

      // The prompt explicitly asks for JSON output, so parse it.
      const parsedOutput: AiGuidedPassportComplianceOutput = JSON.parse(output);

      // A basic runtime check of the parsed output against the schema structure.
      // More robust validation might use Zod's .parse() or .safeParse() if strict validation is critical.
      const isValidOutput = (
        typeof parsedOutput.faceDetected === 'boolean' &&
        Array.isArray(parsedOutput.complianceFeedback) &&
        (parsedOutput.autoCropSuggestion === null || (
          typeof parsedOutput.autoCropSuggestion.xRatio === 'number' &&
          typeof parsedOutput.autoCropSuggestion.yRatio === 'number' &&
          typeof parsedOutput.autoCropSuggestion.widthRatio === 'number' &&
          typeof parsedOutput.autoCropSuggestion.heightRatio === 'number'
        )) &&
        (parsedOutput.eyeLineActualFromTopRatio === null || typeof parsedOutput.eyeLineActualFromTopRatio === 'number') &&
        (parsedOutput.headHeightActualRatio === null || typeof parsedOutput.headHeightActualRatio === 'number')
      );

      if (!isValidOutput) {
        console.error('AI model output did not fully match the expected schema:', parsedOutput);
        throw new Error('AI model output structure is invalid or incomplete.');
      }

      return parsedOutput;
    } catch (error: any) {
      console.error('Error in aiGuidedPassportComplianceFlow:', error);
      // Return a structured error output for better client-side handling
      return {
        faceDetected: false,
        complianceFeedback: [`Failed to analyze photo for compliance: ${error.message || 'Unknown error.'}`],
        autoCropSuggestion: null,
        eyeLineActualFromTopRatio: null,
        headHeightActualRatio: null,
      };
    }
  }
);
