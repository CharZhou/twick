import { Loader2, Video as VideoIcon } from "lucide-react";
import { useMemo } from "react";
import { useTwickI18n } from "@twick/video-editor";
import { useDigitalHumanComposer } from "../../context/digital-human-context";

const FIGURE_LABELS: Record<string, string> = {
  whole_body: "digitalHuman.figure.whole_body",
  circle_view: "digitalHuman.figure.circle_view",
  sit_body: "digitalHuman.figure.sit_body",
};

export function DigitalHumanPropsPanel() {
  const { t } = useTwickI18n();
  const {
    selectedHuman,
    selectedFigure,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    script,
    setScript,
    speechLanguage,
    setSpeechLanguage,
    quality,
    setQuality,
    speed,
    setSpeed,
    showSubtitles,
    setShowSubtitles,
    backgroundColor,
    setBackgroundColor,
    statusText,
    error,
    isGenerating,
    handleGenerate,
  } = useDigitalHumanComposer();

  const selectedFigureLabel = useMemo(() => {
    if (!selectedFigure) {
      return "";
    }

    const figureLabelKey = FIGURE_LABELS[
      selectedFigure.type
    ] as Parameters<typeof t>[0] | undefined;
    return figureLabelKey ? t(figureLabelKey) : selectedFigure.type;
  }, [selectedFigure, t]);

  return (
    <div className="panel-container digital-human-right-panel">
      <div className="digital-human-right-summary">
        <div className="digital-human-right-summary-title">
          {selectedHuman?.name ?? t("digitalHuman.selectHuman")}
        </div>
        {selectedFigure ? (
          <div className="digital-human-right-summary-subtitle">
            {selectedFigureLabel} · {selectedFigure.width}×{selectedFigure.height}
          </div>
        ) : (
          <div className="digital-human-right-summary-subtitle">
            {t("digitalHuman.selectFromLeft")}
          </div>
        )}
      </div>

      <div className="panel-section">
        <label className="label-dark">{t("digitalHuman.script")}</label>
        <textarea
          className="input-dark digital-human-script-input"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={t("digitalHuman.scriptPlaceholder")}
        />
      </div>

      {availableVoices.length > 0 ? (
        <div className="panel-section">
          <label className="label-dark">{t("digitalHuman.voice")}</label>
          <select
            className="select-dark"
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
          >
            {availableVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="panel-section">
        <label className="label-dark">{t("digitalHuman.language")}</label>
        <select
          className="select-dark"
          value={speechLanguage}
          onChange={(e) => setSpeechLanguage(e.target.value as "cn" | "en")}
        >
          <option value="cn">{t("digitalHuman.language.cn")}</option>
          <option value="en">{t("digitalHuman.language.en")}</option>
        </select>
      </div>

      <div className="panel-section">
        <label className="label-dark">{t("digitalHuman.quality")}</label>
        <select
          className="select-dark"
          value={quality}
          onChange={(e) => setQuality(e.target.value as "standard" | "pro")}
        >
          <option value="standard">{t("digitalHuman.quality.standard")}</option>
          <option value="pro">{t("digitalHuman.quality.pro")}</option>
        </select>
      </div>

      <div className="panel-section">
        <label className="label-dark">{t("digitalHuman.speed")}</label>
        <div className="slider-container">
          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="slider-purple"
          />
          <span className="slider-value">{speed.toFixed(1)}x</span>
        </div>
      </div>

      <div className="panel-section">
        <label className="label-dark">{t("digitalHuman.backgroundColor")}</label>
        <div className="color-inputs">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="color-picker"
          />
          <input
            type="text"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="color-text"
          />
        </div>
      </div>

      <div className="panel-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showSubtitles}
            onChange={(e) => setShowSubtitles(e.target.checked)}
            className="checkbox-purple"
          />
          {t("digitalHuman.showSubtitles")}
        </label>
      </div>

      {selectedFigure?.previewVideoUrl ? (
        <div className="panel-section">
          <label className="label-dark">{t("digitalHuman.preview")}</label>
          <video
            src={selectedFigure.previewVideoUrl}
            muted
            loop
            autoPlay
            playsInline
            className="digital-human-preview-video"
          />
        </div>
      ) : null}

      {statusText ? (
        <div className="panel-section">
          <div className="empty-state-text">{statusText}</div>
        </div>
      ) : null}

      {error ? (
        <div className="panel-section">
          <div className="text-error">{error}</div>
        </div>
      ) : null}

      <div className="panel-section">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="icon-sm animate-spin" />
              {t("digitalHuman.generating")}
            </>
          ) : (
            <>
              <VideoIcon className="icon-sm" />
              {t("digitalHuman.generate")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
