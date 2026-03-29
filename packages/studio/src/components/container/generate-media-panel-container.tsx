import React, { useState, useCallback, useEffect } from "react";
import { Size, TrackElement } from "@twick/timeline";
import { ImageElement, VideoElement } from "@twick/timeline";
import { useLivePlayerContext } from "@twick/live-player";
import type { StudioConfig } from "../../types";
import type { ModelInfo } from "@twick/ai-models";
import { useTwickI18n } from "@twick/video-editor";

const DEFAULT_IMAGE_DURATION = 5;

interface GenerateMediaPanelContainerProps {
  videoResolution: Size;
  selectedElement: TrackElement | null;
  addElement: (element: TrackElement) => void;
  updateElement: (element: TrackElement) => void;
  studioConfig?: StudioConfig;
}

export function GenerateMediaPanelContainer({
  videoResolution,
  addElement,
  studioConfig,
}: GenerateMediaPanelContainerProps): React.ReactElement {
  const { t } = useTwickI18n();
  const { getCurrentTime } = useLivePlayerContext();
  const [tab, setTab] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [selectedEndpointId, setSelectedEndpointId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const imageService = studioConfig?.imageGenerationService;
  const videoService = studioConfig?.videoGenerationService;
  const hasAnyService = !!imageService || !!videoService;

  const imageModels = imageService?.getAvailableModels?.() ?? [];
  const videoModels = videoService?.getAvailableModels?.() ?? [];
  const endpoints: ModelInfo[] = tab === "image" ? imageModels : videoModels;
  const defaultEndpointId = endpoints[0]?.endpointId ?? "";
  const selectedEndpoint =
    endpoints.find((endpoint: ModelInfo) => endpoint.endpointId === selectedEndpointId) ??
    endpoints[0];
  const selectedProvider = selectedEndpoint?.provider;

  useEffect(() => {
    if (!selectedEndpointId && defaultEndpointId) {
      setSelectedEndpointId(defaultEndpointId);
    }
  }, [tab, defaultEndpointId, selectedEndpointId]);

  const pollStatus = useCallback(
    async (requestId: string) => {
      const service = tab === "image" ? imageService : videoService;
      if (!service) return;

      const interval = setInterval(async () => {
        try {
          const result = await service.getRequestStatus(requestId);
          if (result.status === "completed" && result.url) {
            clearInterval(interval);
            setIsGenerating(false);
            setStatus(null);
            setError(null);
            const currentTime = getCurrentTime();
            const duration = result.duration ?? DEFAULT_IMAGE_DURATION;

            if (tab === "image") {
              const element = new ImageElement(result.url, videoResolution);
              element.setStart(currentTime);
              element.setEnd(currentTime + duration);
              addElement(element);
            } else {
              const element = new VideoElement(result.url, videoResolution);
              element.setStart(currentTime);
              element.setEnd(currentTime + duration);
              addElement(element);
            }
          } else if (result.status === "failed") {
            clearInterval(interval);
            setIsGenerating(false);
            setStatus(null);
            setError(result.error ?? t("generateMedia.generationFailed"));
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      return () => clearInterval(interval);
    },
    [tab, imageService, videoService, getCurrentTime, videoResolution, addElement]
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError(t("generateMedia.enterPrompt"));
      return;
    }

    if (tab === "image" && !imageService) {
      setError(t("generateMedia.imageNotConfigured"));
      return;
    }
    if (tab === "video" && !videoService) {
      setError(t("generateMedia.videoNotConfigured"));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus(t("generateMedia.starting"));

    try {
      const endpointId = selectedEndpointId || defaultEndpointId;
      const provider = selectedProvider;

      if (!endpointId || !provider) {
        setError(t("generateMedia.noModelConfigured"));
        setIsGenerating(false);
        setStatus(null);
        return;
      }

      if (tab === "image" && imageService) {
        const requestId = await imageService.generateImage({
          provider,
          endpointId,
          prompt: prompt.trim(),
        });
        if (requestId) {
          setStatus(t("generateMedia.generatingImage"));
          pollStatus(requestId);
        }
      } else if (tab === "video" && videoService) {
        const requestId = await videoService.generateVideo({
          provider,
          endpointId,
          prompt: prompt.trim(),
        });
        if (requestId) {
          setStatus(t("generateMedia.generatingVideo"));
          pollStatus(requestId);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("generateMedia.generationFailed");
      setError(msg);
      setIsGenerating(false);
      setStatus(null);
    }
  }, [
    tab,
    prompt,
    selectedEndpointId,
    defaultEndpointId,
    imageService,
    videoService,
    pollStatus,
    selectedProvider,
  ]);

  if (!hasAnyService) {
    return (
      <div className="panel-container">
        <p className="empty-state-text">
          {t("generateMedia.notConfigured")}
        </p>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-section">
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            className={`btn-ghost ${tab === "image" ? "active" : ""}`}
            onClick={() => setTab("image")}
            disabled={!imageService}
          >
            {t("generateMedia.imageTab")}
          </button>
          <button
            type="button"
            className={`btn-ghost ${tab === "video" ? "active" : ""}`}
            onClick={() => setTab("video")}
            disabled={!videoService}
          >
            {t("generateMedia.videoTab")}
          </button>
        </div>

        <div className="mb-2">
          <label className="block text-sm mb-1">{t("generateMedia.model")}</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedEndpointId}
            onChange={(e) => setSelectedEndpointId(e.target.value)}
            disabled={isGenerating}
          >
            {endpoints.map((ep: ModelInfo) => (
              <option key={ep.endpointId} value={ep.endpointId}>
                {ep.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm mb-1">{t("generateMedia.prompt")}</label>
          <textarea
            className="w-full p-2 border rounded min-h-[80px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("generateMedia.promptPlaceholder")}
            disabled={isGenerating}
          />
        </div>

        {error && (
          <div className="mb-2 text-red-600 text-sm">{error}</div>
        )}

        {status && (
          <div className="mb-2 text-sm text-gray-600">{status}</div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating
            ? t("generateMedia.generating")
            : tab === "image"
            ? t("generateMedia.generateImage")
            : t("generateMedia.generateVideo")}
        </button>
      </div>
    </div>
  );
}
