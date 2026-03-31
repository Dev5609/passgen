'use server';
/**
 * @fileOverview A Genkit flow for AI-powered background removal and replacement with a plain white background.
 *
 * - aiBackgroundReplacement - A function that handles the AI background replacement process.
 * - AiBackgroundReplacementInput - The input type for the aiBackgroundReplacement function.
 * - AiBackgroundReplacementOutput - The return type for the aiBackgroundReplacement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

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
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-image'),
      prompt: [
        {media: {url: input.photoDataUri}},
        {
          text:
            'Remove the background from this image and replace it with a plain white background. Ensure the edges are natural and the subject is clearly defined suitable for a passport photo.',
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Failed to get processed image from AI model.');
    }

    return {
      processedPhotoDataUri: media.url,
    };
  }
);
