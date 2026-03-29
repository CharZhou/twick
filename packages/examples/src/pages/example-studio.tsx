import { useBrowserRenderer, type BrowserRenderConfig } from "@twick/browser-render";
import {
  createEmbeddedAetherUploadConfig,
  getChanjingProxyBaseUrlFromUploadConfig,
  TwickStudio,
  LivePlayerProvider,
  TimelineProvider,
  INITIAL_TIMELINE_DATA,
  createChanjingDigitalHumanService,
  type VideoSettings,
  type ProjectJSON,
} from "@twick/studio";
import { TwickI18nProvider, useTwickI18n } from "@twick/video-editor";
import "@twick/studio/dist/studio.css";
import { useMemo, useState } from "react";

const AETHER_OPEN_API_KEY = "ak_test_aether_lab_2024";
const VIDEO_SIZE = {
  width: 720,
  height: 1280,
};

function ExampleStudioContent() {
  const { t } = useTwickI18n();
  const { render, progress, isRendering, error, reset } = useBrowserRenderer({
    includeAudio: true,
    autoDownload: true,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const aetherUploadConfig = useMemo(
    () =>
      createEmbeddedAetherUploadConfig({
        apiKey: AETHER_OPEN_API_KEY,
        directory: "lab-system/twick-assets",
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

  const onExportVideo = async (project: ProjectJSON, videoSettings: VideoSettings) => {
    try {
      setShowSuccess(false);
      const variables = {
        input: {
          ...project,
          properties: {
            width: videoSettings.resolution.width || VIDEO_SIZE.width,
            height: videoSettings.resolution.height || VIDEO_SIZE.height,
            fps: videoSettings.fps || 30,
          },
        },
      } as BrowserRenderConfig["variables"];

      const videoBlob = await render(variables);

      if (videoBlob) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return { status: true, message: t("exampleStudio.exportSuccess") };
      }

      return { status: false, message: t("exampleStudio.exportFailed") };
    } catch (err) {
      return {
        status: false,
        message: err instanceof Error ? err.message : t("exampleStudio.unknownError"),
      };
    }
  };

  const handleCloseError = () => {
    reset();
  };

  return (
    <>
      <LivePlayerProvider>
        <TimelineProvider
          initialData={INITIAL_TIMELINE_DATA}
          contextId={"studio-demo"}
        >
          <TwickStudio
            studioConfig={{
              exportVideo: onExportVideo,
              digitalHumanGenerationService: digitalHumanService,
              uploadConfig: aetherUploadConfig,
              canvasConfig: {
                enableShiftAxisLock: true,
              },
              videoProps: {
                width: 720,
                height: 1280,
              },
            }}
          />
        </TimelineProvider>
      </LivePlayerProvider>

      {isRendering && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              minWidth: "300px",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#fff",
                marginBottom: "20px",
              }}
            >
              {t("exampleStudio.renderingTitle")}
            </div>

            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#333",
                borderRadius: "4px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#4CAF50",
                marginBottom: "8px",
              }}
            >
              {Math.round(progress * 100)}%
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#999",
              }}
            >
              {t("exampleStudio.renderingWait")}
            </div>
          </div>
        </div>
      )}

      {showSuccess && !isRendering && !error && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#4CAF50",
            color: "#fff",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "20px" }}>✓</div>
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              {t("exampleStudio.successTitle")}
            </div>
            <div style={{ fontSize: "14px" }}>
              {t("exampleStudio.successMessage")}
            </div>
          </div>
        </div>
      )}

      {error && !isRendering && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              minWidth: "400px",
              maxWidth: "600px",
              border: "1px solid #f44336",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
              }}
            >
              ⚠️
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#f44336",
                marginBottom: "16px",
              }}
            >
              {t("exampleStudio.renderingFailed")}
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#ccc",
                marginBottom: "24px",
                padding: "16px",
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                textAlign: "left",
                maxHeight: "200px",
                overflow: "auto",
                fontFamily: "monospace",
              }}
            >
              {error.message}
            </div>

            <button
              onClick={handleCloseError}
              style={{
                backgroundColor: "#f44336",
                color: "#fff",
                border: "none",
                padding: "12px 32px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ExampleStudio() {
  return (
    <TwickI18nProvider>
      <ExampleStudioContent />
    </TwickI18nProvider>
  );
}
