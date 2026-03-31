# **App Name**: PassGen

## Core Features:

- Image Upload & Validation: Allows users to upload JPG, JPEG, PNG, or WEBP photos, supports drag-and-drop, displays a real-time preview, and validates file size (max 10MB) and dimensions.
- AI Background Removal: Automatically removes the image background using an AI tool (Remove.bg API) and replaces it with a clean white background, ensuring natural edges suitable for passport photos.
- Image Quality Enhancement: Applies subtle enhancements to image sharpness, brightness, contrast, and clarity, while preserving natural skin tones, suitable for official print quality.
- Interactive Passport Cropping: Provides an interactive cropping tool (Cropper.js) with preset passport photo aspect ratios, zoom, repositioning, live preview, and country-specific face alignment guides (e.g., India, US, UK Passport standards).
- Print Sheet Configuration: Enables users to select the desired number of passport photo copies (e.g., 4, 6, 8) and choose the output page size (A4 or Letter) for printing.
- Printable PDF & Image Generation: Generates high-quality, print-ready PDF sheets, PNG sheets, or ZIP archives containing multiple arranged passport photos with optional thin cutting guides.

## Style Guidelines:

- Primary color: A sophisticated, vibrant blue (`#1F5ADC`) chosen to convey trustworthiness, professionalism, and modern digital precision.
- Background color: A subtle, cool light grey-blue (`#EEF3F7`) derived from the primary hue, providing a clean, uncluttered, and minimalist canvas for the interface.
- Accent color: An analogous purplish-blue (`#6633CC`), used for interactive elements, highlights, and calls to action, providing good contrast and visual harmony with the primary color.
- Headline font: 'Space Grotesk' (sans-serif) to provide a modern, clean, and slightly technical aesthetic, suitable for tool-based applications.
- Body font: 'Inter' (sans-serif) for its excellent readability across all devices and its neutral, objective feel, ensuring clear communication of information.
- Utilize a set of clean, outline-based icons with a professional and minimalist style, aligning with the overall modern SaaS tool aesthetic and improving intuitiveness.
- Implement a clear, responsive, step-by-step workflow with a prominent progress stepper. Key information and interactive elements are contained within rounded cards with subtle soft shadows for a refined, modern feel.
- Incorporate subtle and smooth animations for transitions, loading states, and user feedback (e.g., success/error toasts) to enhance user experience without distracting from the primary task.