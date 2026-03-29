import { Undo2, Redo2 } from "lucide-react";
import { useTwickI18n } from "../../i18n/i18n-context";

type UndoRedoControlsProps = {
  canUndo: boolean; 
  canRedo: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}
export const UndoRedoControls = ({ canUndo, canRedo, onUndo, onRedo }: UndoRedoControlsProps) => {
  const { t } = useTwickI18n();

  return (
    <div className="undo-redo-controls">
      <button
        className={`control-btn${canUndo ? " active" : " btn-disabled"}`}
        onClick={onUndo}
        aria-label={t("player.undo")}
      >
        <Undo2 size={18} strokeWidth={2} />
      </button>

      <button
        onClick={onRedo}
        aria-label={t("player.redo")}
        className={`control-btn${canRedo ? " active" : " btn-disabled"}`}
      >
        <Redo2 size={18} strokeWidth={2} />
      </button>
    </div>
  );
};
