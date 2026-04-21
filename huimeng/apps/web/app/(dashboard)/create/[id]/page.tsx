"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  Save,
} from "lucide-react";
import { CharactersStep } from "./components/steps/characters-step";
import { EpisodesStep } from "./components/steps/episodes-step";
import { ImagesStep } from "./components/steps/images-step";
import { ScenesStep } from "./components/steps/scenes-step";
import { ScriptStep } from "./components/steps/script-step";
import { StoryboardStep } from "./components/steps/storyboard-step";
import { VideoStep } from "./components/steps/video-step";
import { type WorkflowStepId } from "./workflow-config";
import { useCreateWorkflowStore } from "./workflow-store";

const renderStep = (stepId: WorkflowStepId) => {
  switch (stepId) {
    case "script":
      return <ScriptStep />;
    case "episodes":
      return <EpisodesStep />;
    case "characters":
      return <CharactersStep />;
    case "scenes":
      return <ScenesStep />;
    case "storyboard":
      return <StoryboardStep />;
    case "images":
      return <ImagesStep />;
    case "video":
      return <VideoStep />;
    default:
      return null;
  }
};

export default function ProjectCreatePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const initializedProjectIdRef = useRef<string | null>(null);

  const { project, loadingProject, steps, initializeProject, saveAll } =
    useCreateWorkflowStore((state) => ({
      project: state.project,
      loadingProject: state.loadingProject,
      steps: state.steps,
      initializeProject: state.initializeProject,
      saveAll: state.saveAll,
    }));

  const enabledSteps = useMemo(
    () => steps.filter((step) => step.enabled),
    [steps],
  );
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (initializedProjectIdRef.current === params.id) return;
    initializedProjectIdRef.current = params.id;

    void initializeProject(params.id).then((result) => {
      if (result.unauthorized) {
        router.push("/login");
      }
    });
  }, [initializeProject, params.id, router]);

  useEffect(() => {
    if (enabledSteps.length === 0) return;

    if (!stepParam) {
      const defaultStepId = enabledSteps[0]?.id;
      if (defaultStepId) {
        router.replace(`/create/${params.id}?step=${defaultStepId}`, {
          scroll: false,
        });
      }
      return;
    }

    const nextIndex = enabledSteps.findIndex((step) => step.id === stepParam);
    if (nextIndex >= 0 && nextIndex !== currentStep) {
      setCurrentStep(nextIndex);
      return;
    }

    const fallbackStepId = enabledSteps[0]?.id;
    if (nextIndex === -1 && fallbackStepId && stepParam !== fallbackStepId) {
      setCurrentStep(0);
      router.replace(`/create/${params.id}?step=${fallbackStepId}`, {
        scroll: false,
      });
    }
  }, [currentStep, enabledSteps, params.id, router, stepParam]);

  useEffect(() => {
    if (currentStep >= enabledSteps.length && enabledSteps.length > 0) {
      setCurrentStep(0);
    }
  }, [currentStep, enabledSteps.length]);

  const currentStepData = enabledSteps[currentStep];
  const StepIcon = currentStepData?.icon || FileText;
  const completedCount = steps.filter(
    (step) => step.enabled && step.status === "completed",
  ).length;

  const handleStepChange = (index: number) => {
    const stepId = enabledSteps[index]?.id;
    if (!stepId) return;

    setCurrentStep(index);

    if (stepId !== stepParam) {
      router.replace(`/create/${params.id}?step=${stepId}`, { scroll: false });
    }
  };

  if (!currentStepData) {
    return null;
  }

  return (
    <div className="flex h-full">
      <div className="w-56 flex-shrink-0 overflow-y-auto border-r bg-card">
        <div className="border-b p-3">
          <button
            onClick={() => router.push("/projects")}
            className="mb-2 rounded-lg p-1.5 hover:bg-accent"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="truncate text-sm font-bold">
            {loadingProject ? "加载中..." : project?.name || "未命名项目"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedCount}/{steps.filter((step) => step.enabled).length}{" "}
            已完成
          </p>
        </div>

        <div className="space-y-1 p-2">
          {enabledSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = step.status === "completed";
            const isGenerating = step.status === "generating";

            return (
              <button
                key={step.id}
                onClick={() => handleStepChange(index)}
                className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition-all ${
                  isActive
                    ? "border border-primary/30 bg-primary/10"
                    : "hover:bg-accent"
                }`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    isCompleted
                      ? "bg-green-500/10 text-green-500"
                      : isGenerating
                        ? "bg-primary/10 text-primary"
                        : "bg-muted"
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {step.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {currentStepData.id !== "storyboard" ? (
          <div className="flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <StepIcon size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {currentStepData.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            <button
              onClick={() => void saveAll()}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
            >
              <Save size={16} />
              保存全部
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-6">
          {renderStep(currentStepData.id)}
        </div>
      </div>
    </div>
  );
}
