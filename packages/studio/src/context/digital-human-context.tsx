import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectJSON, Size } from "@twick/timeline";
import { useTimelineContext } from "@twick/timeline";
import { useTwickI18n } from "@twick/video-editor";
import type {
  DigitalHumanAsset,
  DigitalHumanGenerationStatus,
  DigitalHumanVoiceOption,
  StudioConfig,
} from "../types";
import { getMediaManager } from "../components/shared";
import { useMedia } from "./media-context";
import {
  getWorkbenchProjectMetadata,
  getWorkbenchProjectMetadataFromProject,
  isDigitalHumanSalesWorkbench,
  mergeWorkbenchProjectMetadata,
} from "../helpers/workbench";

const DEFAULT_BACKGROUND = "#EDEDED";

function uniqueVoices(voices: DigitalHumanVoiceOption[]) {
  const map = new Map<string, DigitalHumanVoiceOption>();
  for (const voice of voices) {
    if (!map.has(voice.id)) {
      map.set(voice.id, voice);
    }
  }
  return Array.from(map.values());
}

function uniqueDigitalHumans(humans: DigitalHumanAsset[]) {
  const map = new Map<string, DigitalHumanAsset>();

  for (const human of humans) {
    const existing = map.get(human.id);
    if (!existing) {
      map.set(human.id, human);
      continue;
    }

    const figureMap = new Map(
      existing.figures.map((figure) => [figure.type, figure]),
    );
    for (const figure of human.figures) {
      if (!figureMap.has(figure.type)) {
        figureMap.set(figure.type, figure);
      }
    }

    map.set(human.id, {
      ...existing,
      figures: Array.from(figureMap.values()),
      defaultVoice: existing.defaultVoice ?? human.defaultVoice,
      tags: Array.from(new Set([...(existing.tags ?? []), ...(human.tags ?? [])])),
      tagIds: Array.from(
        new Set([...(existing.tagIds ?? []), ...(human.tagIds ?? [])]),
      ),
      supports4k: existing.supports4k ?? human.supports4k,
    });
  }

  return Array.from(map.values());
}

interface DigitalHumanComposerContextValue {
  serviceConfigured: boolean;
  digitalHumans: DigitalHumanAsset[];
  availableVoices: DigitalHumanVoiceOption[];
  selectedHuman: DigitalHumanAsset | null;
  selectedHumanId: string;
  setSelectedHumanId: (id: string) => void;
  selectedFigureType: string;
  setSelectedFigureType: (type: string) => void;
  selectedFigure: DigitalHumanAsset["figures"][number] | null;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  script: string;
  setScript: (value: string) => void;
  speechLanguage: "cn" | "en";
  setSpeechLanguage: (value: "cn" | "en") => void;
  quality: "standard" | "pro";
  setQuality: (value: "standard" | "pro") => void;
  speed: number;
  setSpeed: (value: number) => void;
  showSubtitles: boolean;
  setShowSubtitles: (value: boolean) => void;
  backgroundColor: string;
  setBackgroundColor: (value: string) => void;
  isLoadingAssets: boolean;
  isGenerating: boolean;
  statusText: string;
  error: string;
  handleGenerate: () => Promise<void>;
}

const DigitalHumanComposerContext =
  createContext<DigitalHumanComposerContextValue | null>(null);

export function DigitalHumanComposerProvider({
  children,
  studioConfig,
  videoResolution,
}: {
  children: ReactNode;
  studioConfig?: StudioConfig;
  videoResolution: Size;
}) {
  const { t, language } = useTwickI18n();
  const service = studioConfig?.digitalHumanGenerationService;
  const { editor, present } = useTimelineContext();
  const mediaManager = getMediaManager();
  const { addItem } = useMedia("video");

  const [digitalHumans, setDigitalHumans] = useState<DigitalHumanAsset[]>([]);
  const [voices, setVoices] = useState<DigitalHumanVoiceOption[]>([]);
  const [selectedHumanId, setSelectedHumanId] = useState("");
  const [selectedFigureType, setSelectedFigureType] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [script, setScript] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState<"cn" | "en">(
    language === "zh" ? "cn" : "en",
  );
  const [quality, setQuality] = useState<"standard" | "pro">("standard");
  const [speed, setSpeed] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const pollingRef = useRef<number | null>(null);
  const isHydratingFromProjectRef = useRef(false);

  const selectedHuman = useMemo(
    () => digitalHumans.find((item) => item.id === selectedHumanId) ?? null,
    [digitalHumans, selectedHumanId],
  );
  const selectedFigure = useMemo(
    () =>
      selectedHuman?.figures.find((item) => item.type === selectedFigureType) ??
      selectedHuman?.figures[0] ??
      null,
    [selectedFigureType, selectedHuman],
  );

  const availableVoices = useMemo(() => {
    const merged = [
      ...(selectedHuman?.defaultVoice ? [selectedHuman.defaultVoice] : []),
      ...voices,
    ];
    return uniqueVoices(merged);
  }, [selectedHuman?.defaultVoice, voices]);

  useEffect(() => {
    setSpeechLanguage(language === "zh" ? "cn" : "en");
  }, [language]);

  const hydrateFromProject = useCallback(
    (project?: ProjectJSON | null) => {
      const workbench = getWorkbenchProjectMetadataFromProject(project);
      if (!workbench) {
        return;
      }

      isHydratingFromProjectRef.current = true;
      setSelectedHumanId(workbench.avatarId ?? "");
      setSelectedFigureType(workbench.selectedFigureType ?? "");
      setSelectedVoiceId(workbench.selectedVoiceId ?? "");
      setScript(workbench.scriptSnapshot ?? "");
      setSpeechLanguage(workbench.speechLanguage ?? (language === "zh" ? "cn" : "en"));
      setQuality(workbench.quality ?? "standard");
      setSpeed(workbench.speed ?? 1);
      setShowSubtitles(workbench.showSubtitles ?? true);
      setBackgroundColor(workbench.backgroundColor ?? DEFAULT_BACKGROUND);
      Promise.resolve().then(() => {
        isHydratingFromProjectRef.current = false;
      });
    },
    [language],
  );

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!service) {
      setDigitalHumans([]);
      setVoices([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoadingAssets(true);
      setError("");

      try {
        const [humanList, voiceList] = await Promise.all([
          service.listDigitalHumans({ page: 1, size: 24 }),
          service.listVoices ? service.listVoices() : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        const nextHumans = uniqueDigitalHumans(humanList);
        const nextVoices = uniqueVoices(voiceList);

        setDigitalHumans(nextHumans);
        setVoices(nextVoices);
        if (nextHumans[0]) {
          setSelectedHumanId((current) => current || nextHumans[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("digitalHuman.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAssets(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [service, t]);

  useEffect(() => {
    hydrateFromProject(present ?? editor.getProject());
    // Only hydrate the local composer state on initial mount.
    // Ongoing edits sync through metadata persistence below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, hydrateFromProject]);

  useEffect(() => {
    const handleProjectLoaded = () => {
      hydrateFromProject(editor.getProject());
    };

    editor.on("project:loaded", handleProjectLoaded);
    return () => {
      editor.off("project:loaded", handleProjectLoaded);
    };
  }, [editor, hydrateFromProject]);

  useEffect(() => {
    if (!selectedHuman) {
      return;
    }

    if (
      selectedHuman.figures.length > 0 &&
      !selectedHuman.figures.some((item) => item.type === selectedFigureType)
    ) {
      setSelectedFigureType(selectedHuman.figures[0].type);
    }

    const mergedVoices = uniqueVoices([
      ...(selectedHuman.defaultVoice ? [selectedHuman.defaultVoice] : []),
      ...voices,
    ]);

    if (
      mergedVoices.length > 0 &&
      !mergedVoices.some((voice) => voice.id === selectedVoiceId)
    ) {
      setSelectedVoiceId(
        selectedHuman.defaultVoice?.id ?? mergedVoices[0]?.id ?? "",
      );
    }
  }, [selectedFigureType, selectedHuman, selectedVoiceId, voices]);

  useEffect(() => {
    if (!isDigitalHumanSalesWorkbench(studioConfig?.workbench)) {
      return;
    }

    if (isHydratingFromProjectRef.current) {
      return;
    }

    const existingWorkbench = getWorkbenchProjectMetadataFromProject(present);

    const currentMetadata = editor.getMetadata();
    const nextMetadata = mergeWorkbenchProjectMetadata(currentMetadata, {
      stepId: existingWorkbench?.stepId,
      baselineResultId: existingWorkbench?.baselineResultId,
      sourceProjectDraftUrl: existingWorkbench?.sourceProjectDraftUrl,
      avatarId: selectedHumanId || undefined,
      backgroundId: existingWorkbench?.backgroundId,
      selectedFigureType: selectedFigureType || undefined,
      selectedVoiceId: selectedVoiceId || undefined,
      speechLanguage,
      quality,
      speed,
      showSubtitles,
      backgroundColor,
      scriptSnapshot: script.trim() || undefined,
    });

    const nextWorkbench = getWorkbenchProjectMetadata(nextMetadata);
    if (
      JSON.stringify(existingWorkbench ?? null) ===
      JSON.stringify(nextWorkbench ?? null)
    ) {
      return;
    }

    editor.setMetadata(nextMetadata);
  }, [
    backgroundColor,
    editor,
    present,
    quality,
    script,
    selectedFigureType,
    selectedHumanId,
    selectedVoiceId,
    showSubtitles,
    speechLanguage,
    speed,
    studioConfig?.workbench,
  ]);

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleCompletedVideo = async (
    result: DigitalHumanGenerationStatus,
    human: DigitalHumanAsset,
  ) => {
    if (!result.url) {
      throw new Error(t("digitalHuman.missingVideoUrl"));
    }

    const item = await mediaManager.addItem({
      name: `${human.name}-${Date.now()}.mp4`,
      type: "video",
      url: result.url,
      thumbnail: result.previewUrl,
      previewUrl: result.previewUrl,
      metadata: {
        title: human.name,
        source: "chanjing",
        digitalHumanId: human.id,
        figureType: selectedFigure?.type,
        voiceId: selectedVoiceId,
      },
    });
    addItem(item);
    setStatusText(t("digitalHuman.addedToLibrary"));

    if (isDigitalHumanSalesWorkbench(studioConfig?.workbench)) {
      const nextMetadata = mergeWorkbenchProjectMetadata(editor.getMetadata(), {
        avatarId: human.id,
        selectedFigureType: selectedFigure?.type,
        selectedVoiceId: selectedVoiceId || undefined,
        scriptSnapshot: script.trim() || undefined,
        backgroundColor,
      });
      editor.setMetadata(nextMetadata);
    }
  };

  const startPolling = (videoId: string, human: DigitalHumanAsset) => {
    if (!service) {
      return;
    }

    const poll = async () => {
      try {
        const result = await service.getRequestStatus(videoId);
        if (result.status === "completed") {
          stopPolling();
          setIsGenerating(false);
          await handleCompletedVideo(result, human);
          return;
        }

        if (result.status === "failed") {
          stopPolling();
          setIsGenerating(false);
          setError(result.error || t("digitalHuman.generationFailed"));
          setStatusText("");
          return;
        }

        setStatusText(
          t("digitalHuman.generatingProgress", {
            progress: result.progress ?? 0,
          }),
        );
      } catch (err) {
        stopPolling();
        setIsGenerating(false);
        setStatusText("");
        setError(
          err instanceof Error ? err.message : t("digitalHuman.generationFailed"),
        );
      }
    };

    void poll();
    pollingRef.current = window.setInterval(
      poll,
      service.pollingIntervalMs ?? 5000,
    );
  };

  const handleGenerate = async () => {
    if (!service) {
      setError(t("digitalHuman.serviceNotConfigured"));
      return;
    }

    if (!selectedHuman || !selectedFigure) {
      setError(t("digitalHuman.selectHuman"));
      return;
    }

    if (!script.trim()) {
      setError(t("digitalHuman.enterScript"));
      return;
    }

    setError("");
    setStatusText(t("digitalHuman.submitting"));
    setIsGenerating(true);

    try {
      const videoId = await service.createVideo({
        digitalHumanId: selectedHuman.id,
        figureType: selectedFigure.type,
        figureWidth: selectedFigure.width,
        figureHeight: selectedFigure.height,
        script: script.trim(),
        voiceId: selectedVoiceId || selectedHuman.defaultVoice?.id,
        speed,
        backgroundColor,
        showSubtitles,
        speechLanguage,
        quality,
        videoResolution,
      });

      startPolling(videoId, selectedHuman);
    } catch (err) {
      setIsGenerating(false);
      setStatusText("");
      setError(
        err instanceof Error ? err.message : t("digitalHuman.createFailed"),
      );
    }
  };

  const value = useMemo(
    () => ({
      serviceConfigured: Boolean(service),
      digitalHumans,
      availableVoices,
      selectedHuman,
      selectedHumanId,
      setSelectedHumanId,
      selectedFigureType,
      setSelectedFigureType,
      selectedFigure,
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
      isLoadingAssets,
      isGenerating,
      statusText,
      error,
      handleGenerate,
    }),
    [
      availableVoices,
      backgroundColor,
      digitalHumans,
      error,
      handleGenerate,
      isGenerating,
      isLoadingAssets,
      quality,
      script,
      selectedFigure,
      selectedFigureType,
      selectedHuman,
      selectedHumanId,
      selectedVoiceId,
      showSubtitles,
      speechLanguage,
      speed,
      statusText,
    ],
  );

  return (
    <DigitalHumanComposerContext.Provider value={value}>
      {children}
    </DigitalHumanComposerContext.Provider>
  );
}

export function useDigitalHumanComposer() {
  const context = useContext(DigitalHumanComposerContext);
  if (!context) {
    throw new Error(
      "useDigitalHumanComposer must be used within a DigitalHumanComposerProvider",
    );
  }

  return context;
}
