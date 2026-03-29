import { Loader2, Search, UserRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { DigitalHumanAsset, PanelProps } from "../../types";
import { useTwickI18n } from "@twick/video-editor";
import { useDigitalHumanComposer } from "../../context/digital-human-context";

const FIGURE_LABELS: Record<string, string> = {
  whole_body: "digitalHuman.figure.whole_body",
  circle_view: "digitalHuman.figure.circle_view",
  sit_body: "digitalHuman.figure.sit_body",
};

function getHumanSearchText(human: DigitalHumanAsset) {
  return [
    human.name,
    human.gender,
    human.defaultVoice?.name,
    ...(human.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function DigitalHumanPanelContainer(_props: PanelProps) {
  const { t } = useTwickI18n();
  const {
    serviceConfigured,
    digitalHumans,
    selectedHuman,
    selectedHumanId,
    setSelectedHumanId,
    selectedFigure,
    selectedFigureType,
    setSelectedFigureType,
    isLoadingAssets,
    error,
  } = useDigitalHumanComposer();

  const [humanQuery, setHumanQuery] = useState("");
  const deferredHumanQuery = useDeferredValue(humanQuery);

  const filteredHumans = useMemo(() => {
    const query = deferredHumanQuery.trim().toLowerCase();
    if (!query) {
      return digitalHumans;
    }

    return digitalHumans.filter((human) =>
      getHumanSearchText(human).includes(query),
    );
  }, [deferredHumanQuery, digitalHumans]);

  const selectedFigureLabel = useMemo(() => {
    if (!selectedFigure) {
      return "";
    }

    const figureLabelKey = FIGURE_LABELS[
      selectedFigure.type
    ] as Parameters<typeof t>[0] | undefined;
    return figureLabelKey ? t(figureLabelKey) : selectedFigure.type;
  }, [selectedFigure, t]);

  const humanSearchPlaceholder =
    t("digitalHuman.searchPlaceholder");
  const humanSearchSummary = t("digitalHuman.searchSummary", {
    visible: filteredHumans.length,
    total: digitalHumans.length,
  });
  const humanSearchEmptyText = t("digitalHuman.searchEmpty");
  const selectedHumanTitle = t("digitalHuman.currentSelection");
  const selectedHumanPreview = selectedFigure?.cover ?? selectedHuman?.figures[0]?.cover;
  const selectedHumanTags = selectedHuman?.tags?.slice(0, 4) ?? [];

  if (!serviceConfigured) {
    return (
      <div className="panel-container">
        <div className="empty-state">
          <div className="empty-state-content">
            <UserRound className="empty-state-icon" />
            <p className="empty-state-text">
              {t("digitalHuman.serviceNotConfigured")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-title">{t("digitalHuman.title")}</div>

      {isLoadingAssets ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <Loader2 className="empty-state-icon animate-spin" />
            <p className="empty-state-text">{t("digitalHuman.loading")}</p>
          </div>
        </div>
      ) : null}

      {!isLoadingAssets && digitalHumans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <UserRound className="empty-state-icon" />
            <p className="empty-state-text">{t("digitalHuman.empty")}</p>
          </div>
        </div>
      ) : null}

      {digitalHumans.length > 0 ? (
        <>
          <div className="panel-section">
            <div className="digital-human-header">
              <div>
                <label className="label-dark">{t("digitalHuman.chooseHuman")}</label>
                <div className="digital-human-subtitle">{humanSearchSummary}</div>
              </div>
              <div className="digital-human-search">
                <Search className="digital-human-search-icon" />
                <input
                  type="text"
                  value={humanQuery}
                  onChange={(e) => setHumanQuery(e.target.value)}
                  className="input-dark digital-human-search-input"
                  placeholder={humanSearchPlaceholder}
                  aria-label={humanSearchPlaceholder}
                />
              </div>
            </div>

            {filteredHumans.length > 0 ? (
              <div className="digital-human-rail" role="listbox">
                {filteredHumans.map((human) => {
                  const preview = human.figures[0]?.cover;
                  const isSelected = human.id === selectedHumanId;
                  return (
                    <button
                      key={human.id}
                      type="button"
                      className={`digital-human-option${
                        isSelected ? " digital-human-option-selected" : ""
                      }`}
                      onClick={() => setSelectedHumanId(human.id)}
                      aria-pressed={isSelected}
                    >
                      <div className="digital-human-option-media">
                        {preview ? (
                          <img
                            src={preview}
                            alt={human.name}
                            className="digital-human-option-image"
                          />
                        ) : (
                          <div className="digital-human-option-placeholder">
                            <UserRound className="icon-lg" />
                          </div>
                        )}
                      </div>

                      <div className="digital-human-option-body">
                        <div className="digital-human-option-name">
                          {human.name}
                        </div>
                        <div className="digital-human-option-meta">
                          {t("digitalHuman.lookCount", {
                            count: human.figures.length,
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="digital-human-empty-inline">
                {humanSearchEmptyText}
              </div>
            )}

            {selectedHuman ? (
              <div className="digital-human-featured-card">
                <div className="digital-human-featured-heading">
                  {selectedHumanTitle}
                </div>
                <div className="digital-human-featured-media">
                  {selectedHumanPreview ? (
                    <img
                      src={selectedHumanPreview}
                      alt={selectedHuman.name}
                      className="digital-human-featured-image"
                    />
                  ) : (
                    <div className="digital-human-featured-placeholder">
                      <UserRound className="empty-state-icon" />
                    </div>
                  )}
                </div>

                <div className="digital-human-featured-meta">
                  <div className="digital-human-featured-title-row">
                    <div className="digital-human-featured-title">
                      {selectedHuman.name}
                    </div>
                    {selectedHuman.gender ? (
                      <span className="digital-human-pill">
                        {selectedHuman.gender}
                      </span>
                    ) : null}
                  </div>

                  <div className="digital-human-featured-subtitle">
                    {selectedFigureLabel}
                    {selectedFigure
                      ? ` · ${selectedFigure.width}×${selectedFigure.height}`
                      : ""}
                  </div>

                  {selectedHuman.defaultVoice?.name ? (
                    <div className="digital-human-supporting-text">
                      {t("digitalHuman.defaultVoiceLabel", {
                        name: selectedHuman.defaultVoice.name,
                      })}
                    </div>
                  ) : null}

                  {selectedHumanTags.length > 0 ? (
                    <div className="digital-human-chip-row">
                      {selectedHumanTags.map((tag) => (
                        <span key={tag} className="digital-human-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {selectedHuman?.figures.length ? (
            <div className="panel-section">
              <label className="label-dark">{t("digitalHuman.figure")}</label>
              <div className="digital-human-figure-row">
                {selectedHuman.figures.map((figure) => {
                  const figureLabelKey = FIGURE_LABELS[
                    figure.type
                  ] as Parameters<typeof t>[0] | undefined;
                  return (
                    <button
                      key={figure.type}
                      type="button"
                      className={`digital-human-figure-chip${
                        figure.type === selectedFigureType
                          ? " digital-human-figure-chip-selected"
                          : ""
                      }`}
                      onClick={() => setSelectedFigureType(figure.type)}
                    >
                      {figureLabelKey ? t(figureLabelKey) : figure.type}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="panel-section">
              <div className="text-error">{error}</div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
