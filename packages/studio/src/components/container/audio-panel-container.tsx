import { useEffect, useMemo, useState } from "react";
import { useMediaPanel } from "../../hooks/use-media-panel";
import { AudioPanel } from "../panel/audio-panel";
import type { PanelProps } from "../../types";
import { useMedia } from "../../context/media-context";
import { getMediaManager, CloudMediaUpload, FileInput } from "../shared";
import SearchInput from "../shared/search-input";
import {
  type AssetProviderConfig,
  type MediaItem,
  useTwickI18n,
} from "@twick/video-editor";
import { getAssetLibrary } from "../../helpers/asset-library";
import { throttle } from "@twick/video-editor";
import { importFileFromUrl } from "../../hooks/use-cloud-media-upload";

export const AudioPanelContainer = (props: PanelProps) => {
  const { t } = useTwickI18n();
  const [activeSource, setActiveSource] = useState<"user" | "public">("user");

  return (
    <>
      <div className="panel-section">
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn-ghost w-full ${activeSource === "user" ? "btn-primary" : ""
              }`}
            onClick={() => setActiveSource("user")}
          >
            {t("common.myAssets")}
          </button>
          <button
            type="button"
            className={`btn-ghost w-full ${activeSource === "public" ? "btn-primary" : ""
              }`}
            onClick={() => setActiveSource("public")}
          >
            {t("common.public")}
          </button>
        </div>
      </div>

      {activeSource === "user" ? (
        <AudioUserAssetsSection {...props} />
      ) : (
        <AudioPublicAssetsSection />
      )}
    </>
  );
};

function AudioUserAssetsSection(props: PanelProps) {
  const { t } = useTwickI18n();
  const { addItem } = useMedia("audio");
  const mediaManager = getMediaManager();
  const {
    items,
    searchQuery,
    setSearchQuery,
    handleSelection,
    handleFileUpload,
    isLoading,
    acceptFileTypes,
  } = useMediaPanel(
    "audio",
    {
      selectedElement: props.selectedElement ?? null,
      addElement: props.addElement!,
      updateElement: props.updateElement!,
    },
    props.videoResolution,
  );

  const onUrlAdd = async (url: string) => {
    const nameFromUrl = (() => {
      try {
        const u = new URL(url);
        const parts = u.pathname.split("/").filter(Boolean);
        return decodeURIComponent(parts[parts.length - 1] || url);
      } catch {
        return url;
      }
    })();

    const finalUrl =
      props.uploadConfig?.provider === "aether"
        ? (
            await importFileFromUrl(
              {
                uploadApiUrl: props.uploadConfig.uploadApiUrl,
                importApiUrl: props.uploadConfig.importApiUrl,
                provider: props.uploadConfig.provider,
                directory: props.uploadConfig.directory,
                apiKey: props.uploadConfig.apiKey,
                userToken: props.uploadConfig.userToken,
              },
              {
                sourceUrl: url,
                fileName: nameFromUrl,
              },
            )
          ).url
        : url;

    const newItem = await mediaManager.addItem({
      name: nameFromUrl,
      url: finalUrl,
      type: "audio",
      metadata: {
        source: props.uploadConfig?.provider === "aether" ? "aether" : "url",
      },
    });
    addItem(newItem);
  };

  const onCloudUploadSuccess = async (url: string, file: File) => {
    const newItem = await mediaManager.addItem({
      name: file.name,
      url,
      type: "audio",
      metadata: { source: props.uploadConfig?.provider ?? "s3" },
    });
    addItem(newItem);
  };

  return (
    <>
      {!props.uploadConfig && (
        <div className="flex gap-2 panel-section">
          <FileInput
            acceptFileTypes={acceptFileTypes}
            onFileLoad={handleFileUpload}
            buttonText={t("common.importAudio")}
            id="studio-audio-file-input"
            className="btn-ghost w-full file-input-label"
          />
        </div>
      )}
      {props.uploadConfig && (
        <div className="flex panel-section">
          <CloudMediaUpload
            uploadApiUrl={props.uploadConfig.uploadApiUrl}
            importApiUrl={props.uploadConfig.importApiUrl}
            provider={props.uploadConfig.provider}
            directory={props.uploadConfig.directory}
            apiKey={props.uploadConfig.apiKey}
            userToken={props.uploadConfig.userToken}
            accept="audio/*"
            onSuccess={onCloudUploadSuccess}
            buttonText={t("common.uploadAudio")}
            className="btn-ghost w-full"
          />
        </div>
      )}
      <AudioPanel
        items={items}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onItemSelect={handleSelection}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        acceptFileTypes={acceptFileTypes}
        onUrlAdd={onUrlAdd}
      />
    </>
  );
}

function AudioPublicAssetsSection() {
  const { t } = useTwickI18n();
  const assetLibrary = getAssetLibrary();
  const [providerConfigs, setProviderConfigs] = useState<AssetProviderConfig[]>(
    [],
  );
  const [activeProviderId, setActiveProviderId] = useState<string | "all">(
    "all",
  );
  const [publicItems, setPublicItems] = useState<MediaItem[]>([]);
  const [publicSearchQuery, setPublicSearchQuery] = useState("");
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const configs = await assetLibrary.listPublicProviders();
        // Only show providers that actually support audio
        setProviderConfigs(
          configs.filter((c) => c.supportedTypes?.includes("audio")),
        );
      } catch (err) {
        console.error("Failed to load asset providers", err);
      }
    };
    void loadProviders();
  }, [assetLibrary]);

  const loadPublicAssets = async (query: string) => {
    setIsPublicLoading(true);
    try {
      const result = await assetLibrary.listAssets({
        source: "public",
        type: "audio",
        query,
        provider: activeProviderId === "all" ? undefined : activeProviderId,
      });
      setPublicItems(result.items);
    } catch (err) {
      console.error("Failed to load public audio assets", err);
      setPublicItems([]);
    } finally {
      setIsPublicLoading(false);
    }
  };

  const throttledLoadPublicAssets = useMemo(
    () => throttle(loadPublicAssets, 1000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assetLibrary, activeProviderId],
  );

  useEffect(() => {
    if (publicSearchQuery) {
      void throttledLoadPublicAssets(publicSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProviderId, publicSearchQuery]);

  return (
    <>
      <div className="panel-section">
        <div className="property-row">
          <div className="property-row-label">
            <span className="property-label">{t("common.provider")}</span>
          </div>
          <div className="property-row-control">
            <select
              className="select-dark"
              value={activeProviderId}
              onChange={(e) =>
                setActiveProviderId(e.target.value as string | "all")
              }
            >
              <option value="all">{t("common.allProviders")}</option>
              {providerConfigs
                .filter((p) => p.enabled)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="property-row-control">
          <SearchInput
            searchQuery={publicSearchQuery}
            setSearchQuery={(q) => {
              setPublicSearchQuery(q);
            }}
          />
        </div>
      </div>
      <AudioPanel
        items={publicItems}
        searchQuery={publicSearchQuery}
        onSearchChange={setPublicSearchQuery}
        onItemSelect={() => { }}
        onFileUpload={() => { }}
        isLoading={isPublicLoading}
        acceptFileTypes={[]}
        onUrlAdd={() => { }}
      />
    </>
  );
}
