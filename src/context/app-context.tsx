"use client";

import { createContext, useState, ReactNode } from 'react';
import { PASSPORT_STANDARDS, PaperSizeDetails } from '@/lib/constants';

export enum AppStep {
  UPLOAD,
  EDIT,
  EXPORT,
  DOWNLOAD,
}

export type OriginalImage = {
  file: File;
  dataUri: string;
  width: number;
  height: number;
};

export type GeneratedFile = {
  url: string;
  fileName: string;
  mimeType: string;
}

export type StandardDetails = typeof PASSPORT_STANDARDS[keyof typeof PASSPORT_STANDARDS] & { key: string };

interface AppContextType {
  step: AppStep;
  setStep: (step: AppStep) => void;
  originalImage: OriginalImage | null;
  setOriginalImage: (image: OriginalImage | null) => void;
  processedImage: string | null;
  setProcessedImage: (image: string | null) => void;
  croppedImage: string | null;
  setCroppedImage: (image: string | null) => void;
  standard: StandardDetails;
  setStandardKey: (key: string) => void;
  paperSize: PaperSizeDetails;
  setPaperSize: (size: PaperSizeDetails) => void;
  generatedFiles: GeneratedFile[] | null;
  setGeneratedFiles: React.Dispatch<React.SetStateAction<GeneratedFile[] | null>>;
  generatedPngSheet: string | null;
  setGeneratedPngSheet: (data: string | null) => void;
  reset: () => void;
}

const defaultStandardKey = 'us';
const defaultStandard = { ...PASSPORT_STANDARDS[defaultStandardKey], key: defaultStandardKey };

export const AppContext = createContext<AppContextType>({
  step: AppStep.UPLOAD,
  setStep: () => {},
  originalImage: null,
  setOriginalImage: () => {},
  processedImage: null,
  setProcessedImage: () => {},
  croppedImage: null,
  setCroppedImage: () => {},
  standard: defaultStandard,
  setStandardKey: () => {},
  paperSize: { name: 'A4', width_mm: 210, height_mm: 297 },
  setPaperSize: () => {},
  generatedFiles: null,
  setGeneratedFiles: () => {},
  generatedPngSheet: null,
  setGeneratedPngSheet: () => {},
  reset: () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [standardKey, setStandardKeyInternal] = useState<string>(defaultStandardKey);
  const [paperSize, setPaperSize] = useState<PaperSizeDetails>({ name: 'A4', width_mm: 210, height_mm: 297 });
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[] | null>(null);
  const [generatedPngSheet, setGeneratedPngSheet] = useState<string | null>(null);

  const standard = { ...PASSPORT_STANDARDS[standardKey as keyof typeof PASSPORT_STANDARDS], key: standardKey };

  const setStandardKey = (key: string) => {
    if (key in PASSPORT_STANDARDS) {
      setStandardKeyInternal(key);
    }
  };

  const reset = () => {
    setStep(AppStep.UPLOAD);
    setOriginalImage(null);
    setProcessedImage(null);
    setCroppedImage(null);
    setGeneratedFiles(null);
    setGeneratedPngSheet(null);
    setStandardKeyInternal(defaultStandardKey);
  };

  const value = {
    step,
    setStep,
    originalImage,
    setOriginalImage,
    processedImage,
    setProcessedImage,
    croppedImage,
    setCroppedImage,
    standard,
    setStandardKey,
    paperSize,
    setPaperSize,
    generatedFiles,
    setGeneratedFiles,
    generatedPngSheet,
    setGeneratedPngSheet,
    reset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
