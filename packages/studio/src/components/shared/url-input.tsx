import { useState } from "react";
import { Plus } from "lucide-react";
import { useTwickI18n } from "@twick/video-editor";

type MediaType = "video" | "audio" | "image";

const mediaTypeLabelKey = {
  video: "mediaType.video",
  image: "mediaType.image",
  audio: "mediaType.audio",
} as const;

const EXTENSIONS: Record<MediaType, string[]> = {
  video: ["mp4", "webm", "ogg", "mov", "mkv", "m3u8"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "flac"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
};

function isValidUrl(url: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function matchesType(url: string, type: MediaType) {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  const ext = pathname.split(".").pop() || "";
  return EXTENSIONS[type].includes(ext);
}

// (name extraction removed; naming handled by caller if needed)

export default function UrlInput({
  type,
  onSubmit,
}: {
  type: MediaType;
  onSubmit: (url: string) => void | Promise<void>;
}) {
  const { t } = useTwickI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const localizedType = t(mediaTypeLabelKey[type]);

  const tryAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setError(t("urlInput.invalidUrl"));
      return;
    }

    if (!matchesType(trimmed, type)) {
      setError(
        t("urlInput.invalidType", {
          type: localizedType,
          extensions: EXTENSIONS[type].join(", "),
        }),
      );
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("urlInput.invalidUrl"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void tryAdd();
    }
  };

  return (
    <div>
      <div className="flex-container">
        <input
          type="url"
          placeholder={t("urlInput.placeholder", { type: localizedType })}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isSubmitting}
          className="input w-full"
        />
        <button
          className="btn-ghost"
          onClick={() => void tryAdd()}
          disabled={isSubmitting}
          aria-label={t("urlInput.addByUrl", { type: localizedType })}
        >
          <Plus size={16} />
        </button>
      </div>
      {error ? <span className="text-error">{error}</span> : null}
    </div>
  );
}
