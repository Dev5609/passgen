import { configureGenkit } from 'genkit';
import { openAI } from 'genkitx-openai';

configureGenkit({
  plugins: [
      openAI({apiKey: process.env.OPENAI_API_KEY})
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
