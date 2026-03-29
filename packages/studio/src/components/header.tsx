/**
 * StudioHeader Component
 *
 * The top header bar of the studio interface. Contains the studio logo,
 * orientation controls, and action divs for saving and exporting.
 *
 * @component
 * @param {Object} props
 * @param {(resolution: Size) => void} props.setVideoResolution - Callback to update canvas resolution
 *
 * @example
 * ```tsx
 * <StudioHeader
 *   setVideoResolution={(size) => console.log(`New size: ${size.width}x${size.height}`)}
 * />
 * ```
 */

import type { Size } from "@twick/timeline";
import { Save, Download, Clapperboard, File, Plus, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTwickI18n, type TwickLanguagePreference } from "@twick/video-editor";

interface StudioHeaderProps {
  setVideoResolution: (resolution: Size) => void;
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onExportVideo: () => void;
  onExportCaptions: (format: "srt" | "vtt") => void;
  onExportChapters: (format: "youtube" | "json") => void;
}
export const StudioHeader = ({
  setVideoResolution,
  onNewProject,
  onLoadProject,
  onSaveProject,
  onExportVideo,
}: StudioHeaderProps) => {
  const { t, languagePreference, setLanguagePreference } = useTwickI18n();
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "vertical"
  );

  useEffect(() => {
    const orientation = localStorage.getItem("orientation");
    if (orientation) {
      setOrientation(orientation as "horizontal" | "vertical");
    }
  }, []);

  const handleOrientationChange = (nextOrientation: "horizontal" | "vertical") => {
    if (nextOrientation === orientation) return;

    const confirmMessage = t("header.confirmOrientationChange");

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Create a fresh project for the new resolution
    onNewProject();
    setOrientation(nextOrientation);
  };

  useEffect(() => {
    if (orientation === "horizontal") {
      localStorage.setItem("orientation", "horizontal");
      setVideoResolution({ width: 1280, height: 720 });
    } else {
      localStorage.setItem("orientation", "vertical");
      setVideoResolution({ width: 720, height: 1280 });
    }
  }, [orientation]);

  return (
    <header className="header">
      <div className="flex-container">
        <Clapperboard className="icon-lg accent-purple" />
        <h1 className="text-gradient">
          Twick Studio
        </h1>
        <div className="header-separator"></div>
        <div className="flex-container" style={{ gap: "0.5rem" }}>
          <span className="text-sm opacity-80">{t("header.orientation")}</span>
          <button
            className={`btn-ghost ${orientation === "vertical" ? "btn-primary" : ""}`}
            title={t("header.portraitTitle")}
            onClick={() => handleOrientationChange("vertical")}
          >
            <RectangleVertical className="icon-sm" />

          </button>
          <button
            className={`btn-ghost ${orientation === "horizontal" ? "btn-primary" : ""}`}
            title={t("header.landscapeTitle")}
            onClick={() => handleOrientationChange("horizontal")}
          >
            <RectangleHorizontal className="icon-sm" />

          </button>
        </div>
        <div className="flex-container" style={{ gap: "0.5rem" }}>
          <span className="text-sm opacity-80">{t("i18n.language")}</span>
          <select
            className="select-dark"
            value={languagePreference}
            onChange={(e) =>
              setLanguagePreference(e.target.value as TwickLanguagePreference)
            }
            aria-label={t("i18n.language")}
            style={{ minWidth: "7rem" }}
          >
            <option value="auto">{t("i18n.languageAuto")}</option>
            <option value="en">{t("i18n.languageEnglish")}</option>
            <option value="zh">{t("i18n.languageChinese")}</option>
          </select>
        </div>
      </div>
      <div className="flex-container">
        <button
          className="btn-ghost"
          title={t("header.newProject")}
          onClick={onNewProject}
        >
          <Plus className="icon-sm" />
          {t("header.newProject")}
        </button>
        <button
          className="btn-ghost"
          title={t("header.loadProject")}
          onClick={onLoadProject}
        >
          <File className="icon-sm" />
          {t("header.loadProject")}
        </button>
        <button
          className="btn-ghost"
          title={t("header.saveDraft")}
          onClick={onSaveProject}
        >
          <Save className="icon-sm" />
          {t("header.saveDraft")}
        </button>
        {/* <button
          className="btn-ghost"
          title="Export captions as SRT"
          onClick={() => onExportCaptions("srt")}
        >
          <Download className="icon-sm" />
          SRT
        </button>
        <button
          className="btn-ghost"
          title="Export captions as VTT"
          onClick={() => onExportCaptions("vtt")}
        >
          <Download className="icon-sm" />
          VTT
        </button>
        <button
          className="btn-ghost"
          title="Export chapters as YouTube timestamps"
          onClick={() => onExportChapters("youtube")}
        >
          <Download className="icon-sm" />
          Chapters TXT
        </button>
        <button
          className="btn-ghost"
          title="Export chapters as JSON"
          onClick={() => onExportChapters("json")}
        >
          <Download className="icon-sm" />
          Chapters JSON
        </button> */}
        <button
          className="btn-primary"
          title={t("header.export")}
          onClick={onExportVideo}
        >
          <Download className="icon-sm" />
          {t("header.export")}
        </button>
      </div>
    </header>
  );
};

export default StudioHeader;
