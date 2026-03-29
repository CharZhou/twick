/**
 * TextPanel Component
 * 
 * A panel for creating and editing text elements in the studio. Provides comprehensive
 * text styling options including font selection, size, colors, stroke, and shadow effects.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.textContent - Text content to display
 * @param {number} props.fontSize - Font size in pixels
 * @param {string} props.selectedFont - Selected font family
 * @param {boolean} props.isBold - Whether text is bold
 * @param {boolean} props.isItalic - Whether text is italic
 * @param {string} props.textColor - Text color in hex format
 * @param {string} props.strokeColor - Stroke color in hex format
 * @param {boolean} props.applyShadow - Whether to apply shadow effect
 * @param {string} props.shadowColor - Shadow color in hex format
 * @param {number} props.strokeWidth - Width of text stroke
 * @param {boolean} props.applyBackground - Whether to apply background behind text
 * @param {string} props.backgroundColor - Background color in hex (when applyBackground is true)
 * @param {number} props.backgroundOpacity - Background opacity 0-1 (when applyBackground is true)
 * @param {string[]} props.fonts - Available font options
 * @param {(text: string) => void} props.setTextContent - Update text content
 * @param {(size: number) => void} props.setFontSize - Update font size
 * @param {(font: string) => void} props.setSelectedFont - Update selected font
 * @param {(bold: boolean) => void} props.setIsBold - Toggle bold style
 * @param {(italic: boolean) => void} props.setIsItalic - Toggle italic style
 * @param {(color: string) => void} props.setTextColor - Update text color
 * @param {(color: string) => void} props.setStrokeColor - Update stroke color
 * @param {(apply: boolean) => void} props.setApplyShadow - Toggle shadow effect
 * @param {(color: string) => void} props.setShadowColor - Update shadow color
 * @param {(width: number) => void} props.setStrokeWidth - Update stroke width
 * @param {(apply: boolean) => void} props.setApplyBackground - Toggle background
 * @param {(color: string) => void} props.setBackgroundColor - Update background color
 * @param {(opacity: number) => void} props.setBackgroundOpacity - Update background opacity
 * @param {() => void} props.handleApplyChanges - Apply text element changes
 * 
 * @example
 * ```tsx
 * <TextPanel
 *   textContent="Sample Text"
 *   fontSize={48}
 *   selectedFont="Arial"
 *   isBold={false}
 *   isItalic={false}
 *   textColor="#000000"
 *   strokeColor="#ffffff"
 *   applyShadow={false}
 *   shadowColor="#000000"
 *   strokeWidth={0}
 *   fonts={["Arial", "Times New Roman"]}
 *   setTextContent={setText}
 *   setFontSize={setSize}
 *   // ... other handlers
 * />
 * ```
 */

import type { TextPanelState, TextPanelActions } from "../../hooks/use-text-panel";
import { useTwickI18n } from "@twick/video-editor";

export type TextPanelProps = TextPanelState & TextPanelActions;

export function TextPanel({
  textContent,
  fontSize,
  selectedFont,
  isBold,
  isItalic,
  textColor,
  strokeColor,
  applyShadow,
  shadowColor,
  strokeWidth,
  applyBackground,
  backgroundColor,
  backgroundOpacity,
  fonts,
  operation,
  setTextContent,
  setFontSize,
  setSelectedFont,
  setIsBold,
  setIsItalic,
  setTextColor,
  setStrokeColor,
  setApplyShadow,
  setShadowColor,
  setStrokeWidth,
  setApplyBackground,
  setBackgroundColor,
  setBackgroundOpacity,
  handleApplyChanges,
}: TextPanelProps) {
  const { t } = useTwickI18n();
  return (
    <div className="panel-container">
      <div className="panel-title">{t("textPanel.title")}</div>
      {/* Text Content */}
      <div className="flex panel-section">
        <input
          type="text"
          value={textContent}
          placeholder={t("textPanel.placeholder")}
          onChange={(e) => setTextContent(e.target.value)}
          className="input-dark"
        />
      </div>

      {/* Font Size */}
      <div className="panel-section">
        <label className="label-dark">{t("textPanel.fontSize")}</label>
        <div className="slider-container">
          <input
            type="range"
            min="8"
            max="120"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="slider-purple"
          />
          <span className="slider-value">{fontSize}px</span>
        </div>
      </div>

      {/* Font */}
      <div className="panel-section">
        <label className="label-dark">{t("textPanel.font")}</label>
        <div className="font-controls">
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="select-dark"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsBold(!isBold)}
            className={`btn-icon ${isBold ? 'btn-icon-active' : ''}`}
          >
            B
          </button>
          <button
            onClick={() => setIsItalic(!isItalic)}
            className={`btn-icon ${isItalic ? 'btn-icon-active' : ''}`}
          >
            I
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="panel-section">
        <label className="label-dark">{t("textPanel.colors")}</label>
        <div className="color-section">
          {/* Text Color */}
          <div className="color-control">
            <label className="label-small">{t("textPanel.textColor")}</label>
            <div className="color-inputs">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="color-text"
              />
            </div>
          </div>

          {/* Stroke Color */}
          <div className="color-control">
            <label className="label-small">{t("textPanel.strokeColor")}</label>
            <div className="color-inputs">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="color-text"
              />
            </div>
          </div>

          {/* Apply Shadow */}
          <div className="checkbox-control">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyShadow}
                onChange={(e) => setApplyShadow(e.target.checked)}
                className="checkbox-purple"
              />
              {t("textPanel.applyShadow")}
            </label>
          </div>

          {/* Shadow Color - Only shown when shadow is enabled */}
          {applyShadow && (
            <div className="color-control">
              <label className="label-small">{t("textPanel.shadowColor")}</label>
              <div className="color-inputs">
                <input
                  type="color"
                  value={shadowColor}
                  onChange={(e) => setShadowColor(e.target.value)}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={shadowColor}
                  onChange={(e) => setShadowColor(e.target.value)}
                  className="color-text"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="panel-section">
        <label className="label-dark">{t("textPanel.strokeWidth")}</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="2"
            step={0.1}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="slider-purple"
          />
          <span className="slider-value">{strokeWidth}</span>
        </div>
      </div>

      {/* Background (optional) */}
      <div className="panel-section">
        <label className="label-dark">{t("textPanel.background")}</label>
        <div className="color-section">
          <div className="checkbox-control">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyBackground}
                onChange={(e) => setApplyBackground(e.target.checked)}
                className="checkbox-purple"
              />
              {t("textPanel.applyBackground")}
            </label>
          </div>
          {applyBackground && (
            <>
              <div className="color-control">
                <label className="label-small">{t("textPanel.backgroundColor")}</label>
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
                <label className="label-small">{t("textPanel.backgroundOpacity")}</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step={0.1}
                    value={backgroundOpacity}
                    onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                    className="slider-purple"
                  />
                  <span className="slider-value">{Math.round(backgroundOpacity * 100)}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Operation button (only for creation, not edits) */}
      {operation !== "Apply Changes" && (
        <div className="flex panel-section">
          <button onClick={handleApplyChanges} className="btn-primary w-full">
            {operation === "Add Text" ? t("textPanel.addText") : operation}
          </button>
        </div>
      )}
    </div>
  );
}
