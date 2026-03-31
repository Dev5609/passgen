export const PASSPORT_STANDARDS = {
  us: {
    name: 'United States (2x2 inch)',
    width_mm: 50.8,
    height_mm: 50.8,
    rules: {
      minHeadHeightRatio: 0.5,
      maxHeadHeightRatio: 0.69,
      eyeLineFromTopRatio: 0.4, // Approximation: Eyes should be between 1 1/8" and 1 3/8" from bottom. This puts them slightly above center.
      targetAspectRatio: '1:1',
    },
  },
  uk: {
    name: 'United Kingdom (35x45 mm)',
    width_mm: 35,
    height_mm: 45,
    rules: {
      minHeadHeightRatio: 29 / 45, // approx 0.64
      maxHeadHeightRatio: 34 / 45, // approx 0.75
      eyeLineFromTopRatio: 0.45, // No strict rule, but usually centered
      targetAspectRatio: '7:9',
    },
  },
  schengen: {
    name: 'Schengen Visa (35x45 mm)',
    width_mm: 35,
    height_mm: 45,
    rules: {
      minHeadHeightRatio: 32 / 45, // approx 0.71
      maxHeadHeightRatio: 36 / 45, // approx 0.8
      eyeLineFromTopRatio: 0.3, // Eye-to-top distance is specified, making the ratio low
      targetAspectRatio: '7:9',
    },
  },
  india: {
    name: 'India (2x2 inch)',
    width_mm: 50.8,
    height_mm: 50.8,
    rules: {
      minHeadHeightRatio: 0.7,
      maxHeadHeightRatio: 0.8,
      eyeLineFromTopRatio: 0.4,
      targetAspectRatio: '1:1',
    },
  },
};

export const PAPER_SIZES = {
  a4: { name: 'A4', width_mm: 210, height_mm: 297 },
  letter: { name: 'Letter', width_mm: 215.9, height_mm: 279.4 },
};

export const COPY_OPTIONS = [4, 6, 8, 12];

export type PaperSizeDetails = typeof PAPER_SIZES[keyof typeof PAPER_SIZES];
