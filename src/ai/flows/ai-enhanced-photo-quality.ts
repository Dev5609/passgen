'use server';
/**
 * @fileOverview This file implements a Genkit flow for enhancing a photo's quality using AI.
 * It takes an image with a white background, enhances its clarity, sharpness,
 * brightness, and denoises it, specifically improving face clarity, and returns
 * the enhanced image.
 *
 * - aiEnhancedPhotoQuality - A function that handles the photo enhancement process.
 * - AiEnhancedPhotoQualityInput - The input type for the aiEnhancedPhotoQuality function.
 * - AiEnhancedPhotoQualityOutput - The return type for the aiEnhancedPhotoQuality function.
 */

import { defineFlow, generate } from 'genkit';
import { z } from 'zod';

const AiEnhancedPhotoQualityInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The image is expected to already have a plain white background."
    ),
});
export type AiEnhancedPhotoQualityInput = z.infer<typeof AiEnhancedPhotoQualityInputSchema>;

const AiEnhancedPhotoQualityOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      "The AI-enhanced photo, as a data URI that includes a MIME type and uses Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. The image will have improved clarity, sharpness, brightness, contrast, and denoising."
    ),
});
export type AiEnhancedPhotoQualityOutput = z.infer<typeof AiEnhancedPhotoQualityOutputSchema>;

const aiEnhancedPhotoQualityFlow = defineFlow(
  {
    name: 'aiEnhancedPhotoQualityFlow',
    inputSchema: AiEnhancedPhotoQualityInputSchema,
    outputSchema: AiEnhancedPhotoQualityOutputSchema,
  },
  async (input) => {
    const response = await generate({
      model: 'gpt-4o',
      prompt: [
        {
          text: "You are an expert image enhancement AI. Your task is to subtly enhance the provided passport-style photo, which already has a white background. Focus on increasing sharpness slightly, improving brightness and contrast, and gently denoise the image. Crucially, improve the clarity of the face while preserving natural skin tones and avoiding any over-processing. The final image must remain realistic and suitable for official document use.",
        },
        {
          media: {
            url: input.photoDataUri,
          },
        },
      ],
    });

    const media = response.media();
    if (!media || media.length === 0) {
      throw new Error('AI model failed to generate an enhanced image.');
    }

    return {
      enhancedPhotoDataUri: media[0].url,
    };
  }
);


export async function aiEnhancedPhotoQuality(input: AiEnhancedPhotoQualityInput): Promise<AiEnhancedPhotoQualityOutput> {
  return await aiEnhancedPhotoQualityFlow.run(input);
}
