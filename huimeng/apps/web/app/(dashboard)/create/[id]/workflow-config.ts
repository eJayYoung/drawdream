import {
  Clapperboard,
  FileText,
  Film,
  Layers,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

export type WorkflowStepId =
  | "script"
  | "episodes"
  | "characters"
  | "scenes"
  | "storyboard"
  | "images"
  | "video";

export type WorkflowStepStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed"
  | "paused";

export type WorkflowStep = {
  id: WorkflowStepId;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  status: WorkflowStepStatus;
};

const stepDefinitions: Omit<WorkflowStep, "enabled" | "status">[] = [
  {
    id: "script",
    title: "创作剧本",
    description: "输入创意描述，生成或编辑剧本内容",
    icon: FileText,
  },
  {
    id: "episodes",
    title: "智能分集",
    description: "将剧本拆分为多个分集结构",
    icon: Layers,
  },
  {
    id: "characters",
    title: "角色",
    description: "维护角色设定、资产和 AI 生成结果",
    icon: Users,
  },
  {
    id: "scenes",
    title: "场景",
    description: "维护场景设定、环境图和 AI 生成结果",
    icon: MapPin,
  },
  {
    id: "storyboard",
    title: "智能分镜",
    description: "基于剧本或分集生成分镜描述",
    icon: Clapperboard,
  },
  {
    id: "images",
    title: "分镜视频",
    description: "带入上一步分镜列表，在时间轴上打点生成关键帧图片",
    icon: Film,
  },
  {
    id: "video",
    title: "成片",
    description: "按分镜顺序整理视频素材，供下载后自行剪辑",
    icon: Film,
  },
];

export const createInitialSteps = (projectType?: string): WorkflowStep[] =>
  stepDefinitions.map((step) => ({
    ...step,
    enabled: step.id === "episodes" ? projectType === "series" : true,
    status: "pending",
  }));
