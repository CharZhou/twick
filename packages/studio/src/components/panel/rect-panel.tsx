/**
 * RectPanel Component
 * 
 * A panel for creating and editing rectangle shapes in the studio. Provides controls
 * for adjusting corner radius, fill color, opacity, stroke color, and line width.
 * 
 * @component
 * @param {Object} props
 * @param {number} props.cornerRadius - Corner radius in pixels
 * @param {string} props.fillColor - Fill color in hex format
 * @param {string} props.strokeColor - Stroke color in hex format
 * @param {number} props.lineWidth - Stroke width in pixels
 * @param {(radius: number) => void} props.setCornerRadius - Update corner radius
 * @param {(color: string) => void} props.setFillColor - Update fill color
 * @param {(opacity: number) => void} props.setOpacity - Update opacity
 * @param {(color: string) => void} props.setStrokeColor - Update stroke color
 * @param {(width: number) => void} props.setLineWidth - Update line width
 * @param {() => void} props.handleApplyChanges - Apply rectangle element changes
 * 
 * @example
 * ```tsx
 * <RectPanel
 *   cornerRadius={10}
 *   fillColor="#ff0000"
 *   opacity={100}
 *   strokeColor="#000000"
 *   lineWidth={2}
 *   setCornerRadius={setRadius}
 *   setFillColor={setFill}
 *   setOpacity={setOpacity}
 *   setStrokeColor={setStroke}
 *   setLineWidth={setWidth}
 *   handleApplyChanges={applyChanges}
 * />
 * ```
 */

import type { RectPanelState, RectPanelActions } from "../../hooks/use-rect-panel";
import { useTwickI18n } from "@twick/video-editor";

export type RectPanelProps = RectPanelState & RectPanelActions;

export function RectPanel({
  cornerRadius,
  fillColor,
  strokeColor,
  lineWidth,
  operation,
  setCornerRadius,
  setFillColor,
  setStrokeColor,
  setLineWidth,
  handleApplyChanges,
}: RectPanelProps) {
  const { t } = useTwickI18n();
  return (
    <div className="panel-container">
      <div className="panel-title">{t("rectPanel.title")}</div>
      {/* Corner Radius */}
      <div className="panel-section">
        <label className="label-dark">{t("rectPanel.cornerRadius")}</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={cornerRadius}
            onChange={(e) => setCornerRadius(Number(e.target.value))}
            className="slider-purple"
          />
          <span className="slider-value">{cornerRadius}px</span>
        </div>
      </div>

      {/* Fill Color */}
      <div className="panel-section">
        <label className="label-dark">{t("rectPanel.fillColor")}</label>
        <div className="color-inputs">
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="color-picker"
          />
          <input
            type="text"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="color-text"
          />
        </div>
      </div>

      {/* Stroke Color */}
      <div className="panel-section">
        <label className="label-dark">{t("rectPanel.strokeColor")}</label>
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

      {/* Line Width */}
      <div className="panel-section">
        <label className="label-dark">{t("rectPanel.lineWidth")}</label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="slider-purple"
          />
          <span className="slider-value">{lineWidth}px</span>
        </div>
      </div>

      {/* Operation button (only for creation, not edits) */}
      {operation !== "Apply Changes" && (
        <div className="flex panel-section">
          <button
            onClick={handleApplyChanges}
            className="btn-primary w-full"
          >
            {operation === "Add Rectangle" ? t("rectPanel.addRectangle") : operation}
          </button>
        </div>
      )}
    </div>
  );
}
