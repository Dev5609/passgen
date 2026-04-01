'use server';
/**
 * @fileOverview A flow for background removal using AI.
 *
 * - aiBackgroundReplacement - A function that handles the background replacement process.
 * - AiBackgroundReplacementInput - The input type for the aiBackgroundReplacement function.
 * - AiBackgroundReplacementOutput - The return type for the aiBackgroundReplacement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiBackgroundReplacementInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AiBackgroundReplacementInput = z.infer<typeof AiBackgroundReplacementInputSchema>;

const AiBackgroundReplacementOutputSchema = z.object({
  processedPhotoDataUri: z
    .string()
    .describe(
      "The processed photo with the background removed and replaced by a plain white background, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AiBackgroundReplacementOutput = z.infer<typeof AiBackgroundReplacementOutputSchema>;

export async function aiBackgroundReplacement(
  input: AiBackgroundReplacementInput
): Promise<AiBackgroundReplacementOutput> {
  return aiBackgroundReplacementFlow(input);
}

const aiBackgroundReplacementFlow = ai.defineFlow(
  {
    name: 'aiBackgroundReplacementFlow',
    inputSchema: AiBackgroundReplacementInputSchema,
    outputSchema: AiBackgroundReplacementOutputSchema,
  },
  async (input) => {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set. Cannot perform background replacement.");
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image',
      prompt: [
        {
          media: {
            url: input.photoDataUri,
          },
        },
        {
          text: 'You are an expert image editing AI. Your task is to accurately remove the background from the provided photo, leaving only the main subject. Replace the removed background with a plain, solid white background (#FFFFFF). The output image must be a photorealistic image of the subject on the white background and have the same dimensions as the input. Do not add any text or other elements to the image.',
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('AI model failed to generate an image with a removed background.');
    }

    return {
      processedPhotoDataUri: media.url,
    };
  }
);
