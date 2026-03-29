import { ElementProps } from "../properties/element-props";
import { TextEffects } from "../properties/text-effects";
import { Animation } from "../properties/animation";
import {
  VideoElement,
  TextElement,
  AudioElement,
  CaptionElement,
  ArrowElement,
  LineElement,
  RectElement,
  CircleElement,
  type TrackElement,
  Size,
  useTimelineContext,
} from "@twick/timeline";
import { CaptionPropPanel } from "../properties/caption-prop";
import { PlaybackPropsPanel } from "../properties/playback-props";
import { GenerateCaptionsPanel } from "../properties/generate-captions.tsx";
import { TextPropsPanel } from "../properties/text-props";
import { AnnotationStylePanel } from "../properties/annotation-style-panel";
import { DigitalHumanPropsPanel } from "../properties/digital-human-props";
import { ICaptionGenerationPollingResponse, CaptionEntry } from "../../types";
import { useCallback } from "react";
import { useTwickI18n } from "@twick/video-editor";

const DEFAULT_CANVAS_BACKGROUND = "#000000";

interface PropertiesPanelContainerProps {
  selectedTool: string;
  selectedElement: TrackElement | null;
  updateElement: (element: TrackElement) => void;
  addCaptionsToTimeline: (captions: CaptionEntry[]) => void;
  onGenerateCaptions: (videoElement: VideoElement) => Promise<string | null>;
  getCaptionstatus: (reqId: string) => Promise<ICaptionGenerationPollingResponse>;
  pollingIntervalMs: number;
  videoResolution: Size;
}

export function PropertiesPanelContainer({
  selectedTool,
  selectedElement,
  updateElement,
  addCaptionsToTimeline,
  onGenerateCaptions,
  getCaptionstatus,
  pollingIntervalMs,
  videoResolution,
}: PropertiesPanelContainerProps) {
  const { t } = useTwickI18n();
  const { editor, present } = useTimelineContext();
  const backgroundColor =
    present?.backgroundColor ??
    editor.getBackgroundColor() ??
    DEFAULT_CANVAS_BACKGROUND;

  const handleBackgroundColorChange = useCallback(
    (value: string) => {
      editor.setBackgroundColor(value);
    },
    [editor]
  );

  const annotationTitle =
    selectedElement instanceof ArrowElement
      ? t("properties.arrowCallout")
      : selectedElement instanceof LineElement
        ? t("properties.line")
        : selectedElement instanceof RectElement
          ? t("properties.box")
          : selectedElement instanceof CircleElement
            ? t("properties.circle")
            : null;
  const localizedTypeTitleByType: Record<string, string> = {
    video: t("toolbar.video"),
    image: t("toolbar.image"),
    audio: t("toolbar.audio"),
    text: t("toolbar.text"),
    caption: t("toolbar.caption"),
    rect: t("properties.box"),
    circle: t("properties.circle"),
    line: t("properties.line"),
    arrow: t("properties.arrowCallout"),
    effect: t("toolbar.effect"),
  };
  const localizedTypeTitle = selectedElement
    ? localizedTypeTitleByType[selectedElement.getType()]
    : null;
  const title = annotationTitle
    ?? (selectedElement instanceof TextElement ? selectedElement.getText() : null)
    ?? selectedElement?.getName()
    ?? localizedTypeTitle
    ?? t("properties.element");

  return (
    <aside className="properties-panel" aria-label={t("properties.inspectorAria")}>
      <div className="properties-header">
        {!selectedElement && selectedTool === "digital-human" && (
          <h3 className="properties-title">{t("digitalHuman.title")}</h3>
        )}
        {!selectedElement && (
          selectedTool === "digital-human" ? null : (
            <h3 className="properties-title">{t("properties.composition")}</h3>
          )
        )}
        {selectedElement && selectedElement.getType() === "caption" && (
          <h3 className="properties-title">{t("properties.caption")}</h3>
        )}
        {selectedElement && selectedElement.getType() !== "caption" && (
          <h3 className="properties-title">
            {title}
          </h3>
        )}
      </div>

      <div className="prop-content">
        {!selectedElement && selectedTool === "digital-human" && (
          <DigitalHumanPropsPanel />
        )}

        {/* Composition inspector when nothing selected */}
        {!selectedElement && selectedTool !== "digital-human" && (
          <div className="panel-container">
            <div className="panel-title">{t("properties.canvasRender")}</div>
            <div className="properties-group">
              <div className="property-section">
                <span className="property-label">{t("properties.size")}</span>
                <span className="properties-size-readonly">
                  {videoResolution.width} × {videoResolution.height}
                </span>
              </div>
              <div className="color-control">
                <label className="label-small">{t("properties.backgroundColor")}</label>
                <div className="color-inputs">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) =>
                      handleBackgroundColorChange(e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) =>
                      handleBackgroundColorChange(e.target.value)}
                    className="color-text"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caption inspector when caption is selected */}
        {selectedElement instanceof CaptionElement && (
            <>
              <CaptionPropPanel
                selectedElement={selectedElement}
                updateElement={updateElement}
              />
            </>
          )}

        {/* Element inspector when non-caption is selected */}
        {selectedElement && !(selectedElement instanceof CaptionElement) && (
            <>
              {(() => {
                const isText = selectedElement instanceof TextElement;
                const isVideo = selectedElement instanceof VideoElement;
                const isAudio = selectedElement instanceof AudioElement;

                const isAnnotation =
                  selectedElement instanceof ArrowElement ||
                  selectedElement instanceof LineElement ||
                  selectedElement instanceof RectElement ||
                  selectedElement instanceof CircleElement;

                return (
                  <>
                    {/* Typography (Text only) */}
                    {isText && (
                      <TextPropsPanel
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Transform – visual elements only (not audio) */}
                    {!isAudio && (
                      <ElementProps
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Annotation style – color & opacity (arrow, highlight, blur) */}
                    {isAnnotation && (
                      <AnnotationStylePanel
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Playback + Volume – video and audio */}
                    {(isVideo || isAudio) && (
                      <PlaybackPropsPanel
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Text Effects – text only */}
                    {isText && (
                      <TextEffects
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Animations – visual elements only (not audio) */}
                    {!isAudio && (
                      <Animation
                        selectedElement={selectedElement}
                        updateElement={updateElement}
                      />
                    )}

                    {/* Generate Captions – video only */}
                    {isVideo && (
                      <GenerateCaptionsPanel
                        selectedElement={selectedElement}
                        addCaptionsToTimeline={addCaptionsToTimeline}
                        onGenerateCaptions={onGenerateCaptions}
                        getCaptionstatus={getCaptionstatus}
                        pollingIntervalMs={pollingIntervalMs}
                      />
                    )}
                  </>
                );
              })()}
            </>
          )}
      </div>
    </aside>
  );
}
