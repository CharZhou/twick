import { useBrowserRenderer, type BrowserRenderConfig } from "@twick/browser-render";
import {
  createChanjingDigitalHumanService,
  createEmbeddedAetherUploadConfig,
  getChanjingProxyBaseUrlFromUploadConfig,
  getWorkbenchProjectMetadataFromProject,
  LivePlayerProvider,
  TimelineProvider,
  TwickStudio,
  type ProjectJSON,
  type StudioConfig,
  type UseCloudMediaUploadConfig,
  useCloudMediaUpload,
  useTimelineContext,
  withWorkbenchProjectMetadata,
} from "@twick/studio";
import { TwickI18nProvider, useTwickI18n } from "@twick/video-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DigitalHumanWorkbenchInitMessage,
  DigitalHumanWorkbenchInitPayload,
  DigitalHumanWorkbenchOutboundMessage,
  DigitalHumanWorkbenchSavePayload,
} from "../workbench/protocol";
import { isDigitalHumanWorkbenchInitMessage } from "../workbench/protocol";
import "@twick/studio/dist/studio.css";

const AETHER_OPEN_API_KEY = "ak_test_aether_lab_2024";
const DEFAULT_VIDEO_SIZE = {
  width: 720,
  height: 1280,
};

const EMPTY_PROJECT: ProjectJSON = {
  tracks: [],
  version: 1,
};

function getParentOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const currentOrigin = window.location.origin;

  const ancestorOrigins = window.location.ancestorOrigins;
  if (ancestorOrigins && ancestorOrigins.length > 0) {
    const ancestorOrigin = ancestorOrigins[0];
    if (ancestorOrigin && ancestorOrigin !== currentOrigin) {
      return ancestorOrigin;
    }
  }

  if (typeof document === "undefined" || !document.referrer) {
    return null;
  }

  try {
    const referrerOrigin = new URL(document.referrer).origin;
    return referrerOrigin !== currentOrigin ? referrerOrigin : null;
  } catch {
    return null;
  }
}

function createBlankWorkbenchProject(
  payload: DigitalHumanWorkbenchInitPayload,
): ProjectJSON {
  return withWorkbenchProjectMetadata(EMPTY_PROJECT, {
    stepId: payload.stepId,
    baselineResultId: payload.existingConfig?.resultId,
    sourceProjectDraftUrl: payload.existingConfig?.projectDraftUrl,
    avatarId: payload.existingConfig?.avatarId,
    backgroundId: payload.existingConfig?.backgroundId,
    scriptSnapshot:
      payload.scriptContext.fullScript || payload.scriptContext.coreScriptDraft,
  });
}

async function loadDraftProjectFromUrl(
  payload: DigitalHumanWorkbenchInitPayload,
): Promise<ProjectJSON> {
  const draftUrl = payload.existingConfig?.projectDraftUrl;
  if (!draftUrl) {
    throw new Error("Missing project draft for iterate step");
  }

  const response = await fetch(draftUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch project draft: ${response.status}`);
  }

  const project = (await response.json()) as ProjectJSON;
  if (!project || !Array.isArray(project.tracks) || typeof project.version !== "number") {
    throw new Error("Project draft is invalid");
  }

  return withWorkbenchProjectMetadata(project, {
    stepId: payload.stepId,
    baselineResultId: payload.existingConfig?.resultId,
    sourceProjectDraftUrl: draftUrl,
    avatarId: payload.existingConfig?.avatarId,
    backgroundId: payload.existingConfig?.backgroundId,
    scriptSnapshot:
      payload.scriptContext.fullScript || payload.scriptContext.coreScriptDraft,
  });
}

function WorkbenchViewport({
  mode,
  parentOrigin,
  initState,
  uploadConfig,
  studioConfig,
  onPostMessage,
}: {
  mode: "embed" | "standalone";
  parentOrigin: string | null;
  initState: { payload: DigitalHumanWorkbenchInitPayload; version: number } | null;
  uploadConfig?: ReturnType<typeof createEmbeddedAetherUploadConfig>;
  studioConfig: StudioConfig;
  onPostMessage: (message: DigitalHumanWorkbenchOutboundMessage) => void;
}) {
  const { t } = useTwickI18n();
  const { editor, present, videoResolution } = useTimelineContext();
  const [contextError, setContextError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [saveStage, setSaveStage] = useState<"idle" | "rendering" | "uploading-video" | "uploading-draft">("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workbenchShellRef = useRef<HTMLDivElement>(null);

  const effectiveUploadConfig = useMemo<UseCloudMediaUploadConfig>(
    () =>
      uploadConfig ?? {
        uploadApiUrl: "",
        provider: "aether",
        importApiUrl: "",
        directory: "",
        apiKey: "",
        userToken: "",
      },
    [uploadConfig],
  );

  const { uploadFile, isUploading, progress } = useCloudMediaUpload(
    effectiveUploadConfig,
  );
  const { render, isRendering, progress: renderProgress } = useBrowserRenderer({
    includeAudio: true,
    autoDownload: false,
  });

  const emitError = useCallback(
    (message: string) => {
      setContextError(message);
      if (mode === "embed" && parentOrigin) {
        onPostMessage({
          type: "digitalHumanWorkbench.error",
          payload: { message },
        });
      }
    },
    [mode, onPostMessage, parentOrigin],
  );

  const emitLocalError = useCallback((message: string) => {
    setContextError(message);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workbenchShellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!initState) {
      return;
    }

    let cancelled = false;

    const applyInit = async () => {
      setIsLoadingContext(true);
      setContextError(null);

      try {
        const payload = initState.payload;
        const project =
          payload.stepId === "iterate"
            ? await loadDraftProjectFromUrl(payload)
            : createBlankWorkbenchProject(payload);

        if (cancelled) {
          return;
        }

        editor.loadProject(project);
      } catch (error) {
        if (cancelled) {
          return;
        }
        emitError(
          error instanceof Error ? error.message : t("workbench.loadDraftFailed"),
        );
      } finally {
        if (!cancelled) {
          setIsLoadingContext(false);
        }
      }
    };

    void applyInit();

    return () => {
      cancelled = true;
    };
  }, [editor, emitError, initState, t]);

  const currentStepId = initState?.payload.stepId ?? "studio";
  const baselineResultId = initState?.payload.existingConfig?.resultId;

  const handleSaveVersion = useCallback(async () => {
    if (!present) {
      emitError(t("workbench.saveFailed"));
      return;
    }

    if (!uploadConfig) {
      emitError("Workbench upload is not configured");
      return;
    }

    try {
      const resultId = `version-${crypto.randomUUID()}`;
      const project = withWorkbenchProjectMetadata(editor.getProject(), {
        stepId: currentStepId,
        baselineResultId: initState?.payload.existingConfig?.resultId,
        sourceProjectDraftUrl: initState?.payload.existingConfig?.projectDraftUrl,
      });
      const workbenchMetadata = getWorkbenchProjectMetadataFromProject(project);

      setSaveStage("rendering");
      const variables = {
        input: {
          ...project,
          properties: {
            width: videoResolution.width || DEFAULT_VIDEO_SIZE.width,
            height: videoResolution.height || DEFAULT_VIDEO_SIZE.height,
            fps: 30,
          },
        },
      } as BrowserRenderConfig["variables"];

      const videoBlob = await render(variables);
      if (!videoBlob) {
        throw new Error(t("workbench.saveFailed"));
      }

      setSaveStage("uploading-video");
      const videoFile = new File([videoBlob], `${resultId}.mp4`, {
        type: "video/mp4",
      });
      const { url: videoUrl } = await uploadFile(videoFile);

      setSaveStage("uploading-draft");
      const draftFile = new File(
        [JSON.stringify(project, null, 2)],
        `${resultId}.json`,
        {
          type: "application/json",
        },
      );
      const { url: projectDraftUrl } = await uploadFile(draftFile);

      const payload: DigitalHumanWorkbenchSavePayload = {
        resultId,
        phase: currentStepId === "iterate" ? "iteration" : "initial",
        videoUrl,
        projectDraftUrl,
        avatarId: workbenchMetadata?.avatarId,
        backgroundId: workbenchMetadata?.backgroundId,
        scriptSnapshot: workbenchMetadata?.scriptSnapshot,
        returnedAt: new Date().toISOString(),
      };

      if (mode === "embed" && parentOrigin) {
        onPostMessage({
          type: "digitalHumanWorkbench.save",
          payload,
        });
      }

      setContextError(null);
    } catch (error) {
      emitError(error instanceof Error ? error.message : t("workbench.saveFailed"));
    } finally {
      setSaveStage("idle");
    }
  }, [
    currentStepId,
    editor,
    emitError,
    initState?.payload.existingConfig?.projectDraftUrl,
    initState?.payload.existingConfig?.resultId,
    mode,
    onPostMessage,
    parentOrigin,
    present,
    render,
    t,
    uploadConfig,
    uploadFile,
    videoResolution.height,
    videoResolution.width,
  ]);

  const handleCloseWorkbench = useCallback(() => {
    if (mode === "embed" && parentOrigin) {
      onPostMessage({ type: "digitalHumanWorkbench.close" });
      return;
    }

    window.history.back();
  }, [mode, onPostMessage, parentOrigin]);

  const handleToggleFullscreen = useCallback(async () => {
    const shell = workbenchShellRef.current;
    if (!shell || typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
        setContextError(null);
        return;
      }

      if (!document.fullscreenEnabled || typeof shell.requestFullscreen !== "function") {
        throw new Error(t("workbench.fullscreenUnavailable"));
      }

      await shell.requestFullscreen();
      setContextError(null);
    } catch (error) {
      emitLocalError(
        error instanceof Error ? error.message : t("workbench.fullscreenFailed"),
      );
    }
  }, [emitLocalError, t]);

  const loadingMessage =
    saveStage === "rendering"
      ? t("workbench.savingVideo")
      : saveStage === "uploading-video" || saveStage === "uploading-draft"
      ? t("workbench.savingDraft")
      : t("workbench.waitingContext");
  const loadingProgress =
    saveStage === "rendering" ? renderProgress : isUploading ? progress / 100 : 0;
  const shouldShowLoadingOverlay =
    (mode === "embed" && !initState) ||
    isLoadingContext ||
    saveStage !== "idle" ||
    isRendering;

  return (
    <>
      <div
        className={`workbench-shell${isFullscreen ? " workbench-shell-fullscreen" : ""}`}
        ref={workbenchShellRef}
      >
        <div className="workbench-toolbar">
          <div className="workbench-toolbar-meta">
            <div className="workbench-chip">
              {currentStepId === "iterate"
                ? t("workbench.step.iterate")
                : t("workbench.step.studio")}
            </div>
            <div className="workbench-baseline">
              {t("workbench.baseline")}: {baselineResultId ?? t("workbench.noBaseline")}
            </div>
          </div>
          <div className="workbench-toolbar-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void handleToggleFullscreen()}
              disabled={saveStage !== "idle" || isLoadingContext}
              title={
                isFullscreen
                  ? t("workbench.exitFullscreen")
                  : t("workbench.enterFullscreen")
              }
            >
              {isFullscreen
                ? t("workbench.exitFullscreen")
                : t("workbench.enterFullscreen")}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleSaveVersion()}
              disabled={shouldShowLoadingOverlay}
            >
              {t("common.saveVersion")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleCloseWorkbench}
            >
              {t("workbench.returnToTraining")}
            </button>
          </div>
        </div>

        {contextError ? <div className="workbench-error-banner">{contextError}</div> : null}

        <TwickStudio studioConfig={studioConfig} />
      </div>

      {shouldShowLoadingOverlay ? (
        <div className="workbench-overlay">
          <div className="workbench-overlay-card">
            <div className="workbench-overlay-title">{loadingMessage}</div>
            <div className="workbench-overlay-bar">
              <div
                className="workbench-overlay-bar-fill"
                style={{ width: `${Math.max(loadingProgress * 100, 8)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DigitalHumanWorkbenchApp() {
  const [initState, setInitState] = useState<{
    payload: DigitalHumanWorkbenchInitPayload;
    version: number;
  } | null>(null);
  const [trustedParentOrigin, setTrustedParentOrigin] = useState<string | null>(null);
  const detectedParentOrigin = useMemo(() => getParentOrigin(), []);
  const parentOrigin = trustedParentOrigin ?? detectedParentOrigin;
  const mode: "embed" | "standalone" =
    typeof window !== "undefined" && window.parent !== window
      ? "embed"
      : "standalone";
  const aetherUploadConfig = useMemo(
    () =>
      createEmbeddedAetherUploadConfig({
        apiKey: AETHER_OPEN_API_KEY,
        directory: "lab-system/twick-workbench-drafts",
      }),
    [],
  );

  const digitalHumanService = useMemo(() => {
    return createChanjingDigitalHumanService({
      baseUrl:
        import.meta.env.VITE_CHANJING_PROXY_BASE_URL ||
        getChanjingProxyBaseUrlFromUploadConfig(aetherUploadConfig?.uploadApiUrl),
    });
  }, [aetherUploadConfig?.uploadApiUrl]);

  const postToParent = useCallback(
    (message: DigitalHumanWorkbenchOutboundMessage) => {
      if (mode !== "embed") {
        return;
      }

      const targetOrigin =
        message.type === "digitalHumanWorkbench.ready"
          ? parentOrigin ?? "*"
          : parentOrigin;

      if (!targetOrigin) {
        return;
      }

      window.parent.postMessage(message, targetOrigin);
    },
    [mode, parentOrigin],
  );

  useEffect(() => {
    if (mode !== "embed") {
      return;
    }

    postToParent({ type: "digitalHumanWorkbench.ready" });
  }, [mode, postToParent]);

  useEffect(() => {
    if (mode !== "embed") {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (detectedParentOrigin && event.origin !== detectedParentOrigin) {
        return;
      }

      if (!isDigitalHumanWorkbenchInitMessage(event.data)) {
        return;
      }

      setTrustedParentOrigin(event.origin);
      const message = event.data as DigitalHumanWorkbenchInitMessage;
      setInitState((current) => ({
        payload: message.payload,
        version: (current?.version ?? 0) + 1,
      }));
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [detectedParentOrigin, mode]);

  const studioConfig = useMemo<StudioConfig>(
    () => ({
      showHeader: false,
      workbench: {
        kind: "digital-human-sales",
        mode,
      },
      digitalHumanGenerationService: digitalHumanService,
      uploadConfig: aetherUploadConfig,
      canvasConfig: {
        enableShiftAxisLock: true,
      },
      videoProps: DEFAULT_VIDEO_SIZE,
    }),
    [aetherUploadConfig, digitalHumanService, mode],
  );

  return (
    <LivePlayerProvider>
      <TimelineProvider
        initialData={EMPTY_PROJECT}
        contextId="digital-human-workbench"
      >
        <WorkbenchViewport
          mode={mode}
          parentOrigin={parentOrigin}
          initState={initState}
          uploadConfig={aetherUploadConfig}
          studioConfig={studioConfig}
          onPostMessage={postToParent}
        />
      </TimelineProvider>
    </LivePlayerProvider>
  );
}

export default function DigitalHumanWorkbenchPage() {
  return (
    <TwickI18nProvider>
      <DigitalHumanWorkbenchApp />
    </TwickI18nProvider>
  );
}
