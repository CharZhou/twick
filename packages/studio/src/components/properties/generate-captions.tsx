import { TrackElement, VideoElement } from "@twick/timeline";
import { useEffect, useState, useRef } from "react";
import { hasAudio } from "@twick/media-utils";
import { Loader2, VolumeX, Volume2, CheckCircle2, XCircle } from "lucide-react";
import {
  CaptionPhraseLength,
  ICaptionGenerationPollingResponse,
} from "../../types";
import { useTwickI18n } from "@twick/video-editor";

export function GenerateCaptionsPanel({
  selectedElement,
  addCaptionsToTimeline,
  onGenerateCaptions,
  getCaptionstatus,
  pollingIntervalMs = 5000,
}: {
  selectedElement: TrackElement;
  addCaptionsToTimeline: (
    captions: { s: number; e: number; t: string; w?: number[] }[]
  ) => void;
  onGenerateCaptions: (
    videoElement: VideoElement,
    language?: string,
    phraseLength?: CaptionPhraseLength,
  ) => Promise<string | null>;
  getCaptionstatus: (reqId: string) => Promise<ICaptionGenerationPollingResponse>;
  pollingIntervalMs?: number;
}) {
  const { t } = useTwickI18n();
  const [containsAudio, setContainsAudio] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [phraseLength, setPhraseLength] =
    useState<CaptionPhraseLength>("medium");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentReqIdRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startPolling = async (reqId: string) => {
    if (!getCaptionstatus) {
      return;
    }
    setPollingStatus("polling");
    setIsGenerating(true);
    setErrorMessage(null);

    const poll = async () => {
      try {
        const response = await getCaptionstatus(reqId);

        
        if (response.status === "completed") {
          stopPolling();
          setPollingStatus("success");
          setIsGenerating(false);
          
          // Add captions to timeline
          addCaptionsToTimeline(response.captions || []);
          
          // Reset status after 3 seconds
          setTimeout(() => {
            setPollingStatus("idle");
          }, 3000);
        } else if (response.status === "pending") {
          // Continue polling - interval will call this again
        } else if (response.status === "failed") {
          stopPolling();
          setPollingStatus("error");
          setIsGenerating(false);
          setErrorMessage(response.error || t("generateCaptions.failed"));
          console.error("Error generating captions:", response.error);
        }
      } catch (error) {
        stopPolling();
        setPollingStatus("error");
        setIsGenerating(false);
        setErrorMessage(
          error instanceof Error ? error.message : t("generateCaptions.failed"),
        );
        console.error("Error polling for captions:", error);
      }
    };

    // Poll immediately, then at configured interval (default 5 seconds)
    await poll();
    pollingIntervalRef.current = setInterval(poll, pollingIntervalMs);
  };

  const handleGenerateCaptions = async () => {
    if (!(selectedElement instanceof VideoElement)) {
      return;
    }

    setIsGenerating(true);
    setPollingStatus("polling");
    const videoElement = selectedElement as VideoElement;
    

    try {
      const language =
        selectedLanguage === "auto" ? undefined : selectedLanguage;
      const reqId = await onGenerateCaptions(
        videoElement,
        language,
        phraseLength,
      );
      if (!reqId) {
        setPollingStatus("error");
        setIsGenerating(false);
        setErrorMessage(t("generateCaptions.startFailed"));
        console.error("Error generating captions: Failed to start caption generation");
        return;
      }
      currentReqIdRef.current = reqId;
      await startPolling(reqId);
    } catch (error) {
      setPollingStatus("error");
      setIsGenerating(false);
      setErrorMessage(
        error instanceof Error ? error.message : t("generateCaptions.startFailed"),
      );
      console.error("Error generating captions:", error);
    }
  };

  const checkAudio = async () => {
    setIsLoading(true);
    if (selectedElement instanceof VideoElement) {
      const videoElement = selectedElement as VideoElement;
      const videoUrl = videoElement.getSrc();
      if (videoUrl) {
        try {
          const hasAudioTrack = await hasAudio(videoUrl);
          setContainsAudio(hasAudioTrack);
        } catch (error) {
          console.error("Error checking audio:", error);
          setContainsAudio(false);
        }
      } else {
        setContainsAudio(false);
      }
    } else {
      setContainsAudio(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkAudio();
    // Reset polling state when element changes
    stopPolling();
    setPollingStatus("idle");
    setIsGenerating(false);
    setErrorMessage(null);
  }, [selectedElement]);

  return (
    <div className="panel-container">
      <div className="panel-title">{t("generateCaptions.title")}</div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <Loader2 className="empty-state-icon animate-spin" />
              <p className="empty-state-text">{t("generateCaptions.checkingAudio")}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Audio State */}
      {!isLoading && containsAudio === false && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <VolumeX className="empty-state-icon" />
              <p className="empty-state-text">{t("generateCaptions.noAudio")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Present State */}
      {!isLoading && containsAudio === true && pollingStatus === "idle" && !isGenerating && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <Volume2 className="empty-state-icon" />
              <p className="empty-state-text">{t("generateCaptions.audioDetected")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Language selection */}
      {!isLoading && containsAudio === true && (
        <div className="panel-section">
          <label className="label-dark" htmlFor="caption-language">
            {t("generateCaptions.audioLanguage")}
          </label>
          <select
            id="caption-language"
            className="select-dark"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="auto">{t("generateCaptions.autoDetect")}</option>
            <option value="english">{t("generateCaptions.language.english")}</option>
            <option value="italian">{t("generateCaptions.language.italian")}</option>
            <option value="spanish">{t("generateCaptions.language.spanish")}</option>
            <option value="portuguese">{t("generateCaptions.language.portuguese")}</option>
            <option value="french">{t("generateCaptions.language.french")}</option>
            <option value="german">{t("generateCaptions.language.german")}</option>
            <option value="turkish">{t("generateCaptions.language.turkish")}</option>
            <option value="indonesian">{t("generateCaptions.language.indonesian")}</option>
            <option value="hindi">{t("generateCaptions.language.hindi")}</option>
          </select>
        </div>
      )}
      {/* Caption length selection */}
      {!isLoading && containsAudio === true && (
        <div className="panel-section">
          <label className="label-dark" htmlFor="caption-phrase-length">
            {t("generateCaptions.captionLength")}
          </label>
          <select
            id="caption-phrase-length"
            className="select-dark"
            value={phraseLength}
            onChange={(e) =>
              setPhraseLength(e.target.value as CaptionPhraseLength)
            }
          >
            <option value="short">{t("generateCaptions.length.short")}</option>
            <option value="medium">{t("generateCaptions.length.medium")}</option>
            <option value="long">{t("generateCaptions.length.long")}</option>
          </select>
        </div>
      )}

      {/* Polling/Generating State */}
      {!isLoading && isGenerating && pollingStatus === "polling" && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <Loader2 className="empty-state-icon animate-spin" />
              <p className="empty-state-text">{t("generateCaptions.generating")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {!isLoading && pollingStatus === "success" && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <CheckCircle2 className="empty-state-icon" color="var(--color-green-500)" />
              <p className="empty-state-text">{t("generateCaptions.success")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && pollingStatus === "error" && (
        <div className="panel-section">
          <div className="empty-state">
            <div className="empty-state-content">
              <XCircle className="empty-state-icon" color="var(--color-red-500)" />
              <p className="empty-state-text">{errorMessage || t("generateCaptions.failed")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!isLoading && (
        <div className="flex panel-section">
          <button
            onClick={handleGenerateCaptions}
            disabled={!containsAudio || isGenerating}
            className="btn-primary w-full"
          >
            {isGenerating
              ? t("generateCaptions.generatingButton")
              : t("generateCaptions.generate")}
          </button>
        </div>
      )}
    </div>
  );
}
