import { useEffect, useMemo, useState } from "react";
import type { PanelProps } from "../../types";
import { ImagePanel } from "../panel/image-panel";
import { useMediaPanel } from "../../hooks/use-media-panel";
import { useMedia } from "../../context/media-context";
import { getMediaManager, CloudMediaUpload, FileInput } from "../shared";
import SearchInput from "../shared/search-input";
import {
  throttle,
  type AssetProviderConfig,
  type MediaItem,
  useTwickI18n,
} from "@twick/video-editor";
import { getAssetLibrary } from "../../helpers/asset-library";
import { importFileFromUrl } from "../../hooks/use-cloud-media-upload";
import { useTimelineContext } from "@twick/timeline";
import {
  isDigitalHumanSalesWorkbench,
  setMediaItemAsWorkbenchBackground,
} from "../../helpers/workbench";

export function ImagePanelContainer(props: PanelProps) {
  const { t } = useTwickI18n();
  const [activeSource, setActiveSource] = useState<"user" | "public">("user");
  const { editor, totalDuration } = useTimelineContext();
  const isWorkbenchMode = isDigitalHumanSalesWorkbench(props.studioConfig?.workbench);

  const handleSetAsBackground = async (item: MediaItem) => {
    await setMediaItemAsWorkbenchBackground({
      editor,
      item,
      videoResolution: props.videoResolution,
      durationSec: totalDuration,
    });
  };

  return (
    <>
      <div className="panel-section">
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn-ghost w-full ${
              activeSource === "user" ? "btn-primary" : ""
            }`}
            onClick={() => setActiveSource("user")}
          >
            {t("common.myAssets")}
          </button>
          <button
            type="button"
            className={`btn-ghost w-full ${
              activeSource === "public" ? "btn-primary" : ""
            }`}
            onClick={() => setActiveSource("public")}
          >
            {t("common.public")}
          </button>
        </div>
      </div>

      {activeSource === "user" ? (
        <ImageUserAssetsSection
          {...props}
          onSetAsBackground={isWorkbenchMode ? handleSetAsBackground : undefined}
        />
      ) : (
        <ImagePublicAssetsSection
          videoResolution={props.videoResolution}
          onSetAsBackground={isWorkbenchMode ? handleSetAsBackground : undefined}
        />
      )}
    </>
  );
}

function ImageUserAssetsSection(
  props: PanelProps & { onSetAsBackground?: (item: MediaItem) => void },
) {
  const { t } = useTwickI18n();
  const { addItem } = useMedia("image");
  const mediaManager = getMediaManager();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const {
    items,
    searchQuery,
    setSearchQuery,
    handleSelection,
    handleFileUpload,
    isLoading,
    acceptFileTypes,
  } = useMediaPanel(
    "image",
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
      type: "image",
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
      type: "image",
      metadata: { source: props.uploadConfig?.provider ?? "s3" },
    });
    addItem(newItem);
  };

  const visibleItems = items.slice(0, page * PAGE_SIZE);
  const canLoadMore = items.length > visibleItems.length;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  return (
    <>
      {!props.uploadConfig && (
        <div className="flex gap-2 panel-section">
          <FileInput
            acceptFileTypes={acceptFileTypes}
            onFileLoad={handleFileUpload}
            buttonText={t("common.importImage")}
            id="studio-image-file-input"
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
            accept="image/*"
            onSuccess={onCloudUploadSuccess}
            buttonText={t("common.uploadImage")}
            className="btn-ghost w-full"
          />
        </div>
      )}
      <ImagePanel
        items={visibleItems}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onItemSelect={handleSelection}
        onSetAsBackground={props.onSetAsBackground}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        acceptFileTypes={acceptFileTypes}
        onUrlAdd={onUrlAdd}
        canLoadMore={canLoadMore}
        onLoadMore={() => setPage((prev) => prev + 1)}
      />
    </>
  );
}

function ImagePublicAssetsSection({
  videoResolution,
  onSetAsBackground,
}: {
  videoResolution: PanelProps["videoResolution"];
  onSetAsBackground?: (item: MediaItem) => void;
}) {
  const { t } = useTwickI18n();
  const assetLibrary = getAssetLibrary();
  const { editor, totalDuration } = useTimelineContext();
  const [providerConfigs, setProviderConfigs] = useState<AssetProviderConfig[]>(
    [],
  );
  const [activeProviderId, setActiveProviderId] = useState<string | "all">(
    "all",
  );
  const [publicItems, setPublicItems] = useState<MediaItem[]>([]);
  const [publicSearchQuery, setPublicSearchQuery] = useState("nature");
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const configs = await assetLibrary.listPublicProviders();
        // Only show providers that actually support images
        setProviderConfigs(
          configs.filter((c) => c.supportedTypes?.includes("image")),
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
        type: "image",
        query,
        provider: activeProviderId === "all" ? undefined : activeProviderId,
        page: 1,
        pageSize: PAGE_SIZE,
      });
      setPublicItems(result.items);
      setPage(1);
      setHasMore(result.items.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load public image assets", err);
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

  const loadMore = async () => {
    if (!hasMore || isPublicLoading) return;
    const nextPage = page + 1;
    setIsPublicLoading(true);
    try {
      const result = await assetLibrary.listAssets({
        source: "public",
        type: "image",
        query: publicSearchQuery,
        provider: activeProviderId === "all" ? undefined : activeProviderId,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setPublicItems((prev) => [...prev, ...result.items]);
      setPage(nextPage);
      setHasMore(result.items.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more public image assets", err);
    } finally {
      setIsPublicLoading(false);
    }
  };

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
      <ImagePanel
        items={publicItems}
        searchQuery={publicSearchQuery}
        onSearchChange={setPublicSearchQuery}
        onItemSelect={() => {}}
        onSetAsBackground={
          onSetAsBackground
            ? (item) =>
                setMediaItemAsWorkbenchBackground({
                  editor,
                  item,
                  videoResolution,
                  durationSec: totalDuration,
                })
            : undefined
        }
        onFileUpload={() => {}}
        isLoading={isPublicLoading}
        acceptFileTypes={[]}
        onUrlAdd={() => {}}
        showAddByUrl={false}
        canLoadMore={hasMore}
        onLoadMore={loadMore}
      />
    </>
  );
}
