"use client";

import { useContext, useMemo } from "react";
import { AppContext, AppStep } from "@/context/app-context";
import Logo from "@/components/logo";
import { Stepper } from "@/components/stepper";
import UploadStep from "@/components/steps/upload-step";
import EditStep from "@/components/steps/edit-step";
import ExportStep from "@/components/steps/export-step";
import DownloadStep from "@/components/steps/download-step";

const STEPS = [
  { id: AppStep.UPLOAD, name: "Upload Photo" },
  { id: AppStep.EDIT, name: "Edit & Crop" },
  { id: AppStep.EXPORT, name: "Export" },
  { id: AppStep.DOWNLOAD, name: "Download" },
];

export default function PassGenStudio() {
  const { step } = useContext(AppContext);

  const currentStepInfo = useMemo(() => {
    const info = STEPS.find((s) => s.id === step);
    const index = STEPS.findIndex((s) => s.id === step);
    return { ...info, index };
  }, [step]);
  
  const renderStep = () => {
    switch (step) {
      case AppStep.UPLOAD:
        return <UploadStep />;
      case AppStep.EDIT:
        return <EditStep />;
      case AppStep.EXPORT:
        return <ExportStep />;
      case AppStep.DOWNLOAD:
        return <DownloadStep />;
      default:
        return <UploadStep />;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="w-full max-w-md">
             <Stepper steps={STEPS.map(s => s.name)} currentStep={currentStepInfo.index} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start p-4 md:p-8">
        <div className="w-full max-w-5xl">
          {renderStep()}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PassGen. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
