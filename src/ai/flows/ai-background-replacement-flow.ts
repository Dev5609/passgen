'use server';
/**
 * @fileOverview A flow for background removal using the remove.bg API.
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
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
      throw new Error(
        'REMOVEBG_API_KEY is not set in the environment variables.'
      );
    }

    const base64Data = input.photoDataUri.split(',')[1];

    const formData = new FormData();
    formData.append('image_file_b64', base64Data);
    formData.append('bg_color', 'white');
    formData.append('size', 'auto'); // To get the full resolution image

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorBody = 'Could not read error body';
      try {
        errorBody = await response.text();
      } catch (e) {
        // ignore
      }
      throw new Error(
        `Background removal API failed with status ${response.status}: ${errorBody}`
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/png';
    const resultBase64 = Buffer.from(imageBuffer).toString('base64');
    const processedPhotoDataUri = `data:${mimeType};base64,${resultBase64}`;

    return {
      processedPhotoDataUri,
    };
  }
);
