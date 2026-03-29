/**
 * Service interfaces for generative AI image and video.
 * Uses types from @twick/ai-models for ModelInfo and polling response.
 */
import type {
  AIModelProvider,
  IGenerationPollingResponse,
  ModelInfo,
} from "@twick/ai-models";

/** Parameters for image generation */
export interface GenerateImageParams {
  provider: AIModelProvider;
  endpointId: string;
  prompt: string;
  image_url?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  negative_prompt?: string;
}

/** Parameters for video generation */
export interface GenerateVideoParams {
  provider: AIModelProvider;
  endpointId: string;
  prompt: string;
  image_url?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  negative_prompt?: string;
}

export interface IImageGenerationService {
  /** Submit image generation job; returns requestId for polling */
  generateImage: (params: GenerateImageParams) => Promise<string>;
  /** Poll status of generation job */
  getRequestStatus: (reqId: string) => Promise<IGenerationPollingResponse>;
  /** Available image models */
  getAvailableModels?: () => ModelInfo[];
}

export interface IVideoGenerationService {
  /** Submit video generation job; returns requestId for polling */
  generateVideo: (params: GenerateVideoParams) => Promise<string>;
  /** Poll status of generation job */
  getRequestStatus: (reqId: string) => Promise<IGenerationPollingResponse>;
  /** Available video models */
  getAvailableModels?: () => ModelInfo[];
}

export interface DigitalHumanFigure {
  type: "whole_body" | "circle_view" | "sit_body" | string;
  cover: string;
  width: number;
  height: number;
  previewVideoUrl?: string;
  canReplaceBackground?: boolean;
}

export interface DigitalHumanVoiceOption {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  auditionUrl?: string;
  description?: string;
}

export interface DigitalHumanAsset {
  id: string;
  name: string;
  gender?: string;
  figures: DigitalHumanFigure[];
  defaultVoice?: DigitalHumanVoiceOption;
  tags?: string[];
  tagIds?: number[];
  supports4k?: boolean;
}

export interface ListDigitalHumansParams {
  page?: number;
  size?: number;
  source?: number;
  tagIds?: number[];
}

export interface CreateDigitalHumanVideoParams {
  digitalHumanId: string;
  figureType: string;
  figureWidth?: number;
  figureHeight?: number;
  script: string;
  voiceId?: string;
  speed?: number;
  backgroundColor?: string;
  showSubtitles?: boolean;
  speechLanguage?: "cn" | "en";
  quality?: "standard" | "pro";
  videoResolution: {
    width: number;
    height: number;
  };
}

export interface DigitalHumanGenerationStatus {
  status: "pending" | "completed" | "failed";
  progress?: number;
  error?: string;
  url?: string;
  previewUrl?: string;
  duration?: number;
  rawStatus?: number;
}

export interface IDigitalHumanGenerationService {
  /** List available digital humans that can be used for synthesis. */
  listDigitalHumans: (
    params?: ListDigitalHumansParams,
  ) => Promise<DigitalHumanAsset[]>;
  /** Optional voice list for richer editing. */
  listVoices?: () => Promise<DigitalHumanVoiceOption[]>;
  /** Create a digital human synthesis job and return the created video id. */
  createVideo: (params: CreateDigitalHumanVideoParams) => Promise<string>;
  /** Poll the created video id until completed. */
  getRequestStatus: (videoId: string) => Promise<DigitalHumanGenerationStatus>;
  /** Polling interval in milliseconds. Defaults to 5000. */
  pollingIntervalMs?: number;
}

export interface GenerateVoiceoverParams {
  provider: AIModelProvider;
  endpointId: string;
  text: string;
  voice?: string;
  speed?: number;
}

export interface IVoiceoverService {
  generateVoiceover: (params: GenerateVoiceoverParams) => Promise<string>;
  getRequestStatus: (reqId: string) => Promise<IGenerationPollingResponse>;
  getAvailableModels?: () => ModelInfo[];
}

export interface TranslateCaptionsParams {
  provider: AIModelProvider;
  sourceLanguage: string;
  targetLanguage: string;
  captions: Array<{ s: number; e: number; t: string }>;
}

export interface ITranslationService {
  translateCaptions: (params: TranslateCaptionsParams) => Promise<string>;
  getRequestStatus: (reqId: string) => Promise<IGenerationPollingResponse>;
  getAvailableModels?: () => ModelInfo[];
}

export interface ScriptToTimelineParams {
  provider: AIModelProvider;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface IScriptToTimelineService {
  generateTimelineFromScript: (params: ScriptToTimelineParams) => Promise<string>;
  getRequestStatus: (reqId: string) => Promise<IGenerationPollingResponse>;
  getAvailableModels?: () => ModelInfo[];
}
