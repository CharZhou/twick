import { linearToDb, dbToLinear, MIN_DB, MAX_DB } from "../../helpers/volume-db";
import type { PropertiesPanelProps } from "../../types";
import { AccordionItem } from "../shared/accordion-item";
import { PropertyRow } from "./property-row";
import { Music2 } from "lucide-react";
import { useState } from "react";
import { useTwickI18n } from "@twick/video-editor";

const PLAYBACK_RATE_MIN = 0.25;
const PLAYBACK_RATE_MAX = 2;
const PLAYBACK_RATE_STEP = 0.25;

export function PlaybackPropsPanel({
  selectedElement,
  updateElement,
}: PropertiesPanelProps) {
  const { t } = useTwickI18n();
  const elementProps = selectedElement?.getProps() || {};
  const volumeLinear = elementProps.volume ?? 1;
  const volumeDb = linearToDb(volumeLinear);
  const playbackRate = elementProps.playbackRate ?? 1;

  const handleUpdateElement = (props: Record<string, any>) => {
    if (selectedElement) {
      updateElement?.(selectedElement?.setProps({ ...elementProps, ...props }));
    }
  };

  const handleVolumeDbChange = (db: number) => {
    handleUpdateElement({ volume: dbToLinear(db) });
  };

  const handlePlaybackRateChange = (rate: number) => {
    handleUpdateElement({ playbackRate: rate });
  };

  const [isPlaybackOpen, setIsPlaybackOpen] = useState(false);

  return (
    <div className="panel-container">
      <div className="panel-title">{t("playback.title")}</div>
      <AccordionItem
        title={t("playback.section")}
        icon={<Music2 className="icon-sm" />}
        isOpen={isPlaybackOpen}
        onToggle={() => setIsPlaybackOpen((open) => !open)}
      >
        <div className="properties-group">
          {/* Playback rate */}
          <div className="property-section">
            <PropertyRow
              label={t("playback.rate")}
              secondary={<span>{playbackRate}×</span>}
            >
              <input
                type="range"
                min={PLAYBACK_RATE_MIN}
                max={PLAYBACK_RATE_MAX}
                step={PLAYBACK_RATE_STEP}
                value={playbackRate}
                onChange={(e) =>
                  handlePlaybackRateChange(Number(e.target.value))
                }
                className="slider-purple"
              />
            </PropertyRow>
          </div>

          {/* Volume (dB) */}
          <div className="property-section">
            <PropertyRow
              label={t("playback.volume")}
              secondary={
                <span>
                  {volumeDb <= MIN_DB ? "−∞" : `${Math.round(volumeDb)} dB`}
                </span>
              }
            >
              <input
                type="range"
                min={MIN_DB}
                max={MAX_DB}
                step={1}
                value={volumeDb}
                onChange={(e) =>
                  handleVolumeDbChange(Number(e.target.value))
                }
                className="slider-purple"
              />
            </PropertyRow>
          </div>
        </div>
      </AccordionItem>
    </div>
  );
}
