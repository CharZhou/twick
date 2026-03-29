import type {
  CreateDigitalHumanVideoParams,
  DigitalHumanAsset,
  DigitalHumanFigure,
  DigitalHumanGenerationStatus,
  DigitalHumanVoiceOption,
  IDigitalHumanGenerationService,
  ListDigitalHumansParams,
} from "../types";

type FetchLike = typeof fetch;

interface ChanjingApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  trace_id?: string;
}

interface ChanjingPageInfo {
  page: number;
  size: number;
  total_count: number;
  total_page: number;
}

interface ChanjingListResponse<T> {
  list: T[];
  page_info?: ChanjingPageInfo;
}

interface ChanjingDigitalHumanFigure {
  type: string;
  cover: string;
  width: number;
  height: number;
  preview_video_url?: string;
  bg_replace?: boolean;
}

interface ChanjingDigitalHumanItem {
  id: string;
  name: string;
  gender?: string;
  figures?: ChanjingDigitalHumanFigure[];
  audio_man_id?: string;
  audio_name?: string;
  audio_preview?: string;
  audio_lang?: string;
  tag_names?: string[];
  tag_ids?: number[];
  support_4k?: boolean;
}

interface ChanjingVoiceItem {
  id: string;
  name: string;
  gender?: string;
  lang?: string;
  speed?: number;
  pitch?: number;
  audition?: string;
  desc?: string;
}

interface ChanjingVideoDetail {
  id: string;
  status: number;
  progress?: number;
  msg?: string;
  video_url?: string;
  preview_url?: string;
  duration?: number;
}

export interface CreateChanjingDigitalHumanServiceOptions {
  getAccessToken?: () => Promise<string>;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  pollingIntervalMs?: number;
}

export interface CreateChanjingAccessTokenProviderOptions {
  appId: string;
  secretKey: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

export interface CreateChanjingAccessTokenProviderFromEndpointOptions {
  tokenApiUrl: string;
  fetchImpl?: FetchLike;
  requestInit?: RequestInit;
}

const DEFAULT_BASE_URL = "https://www.chanjing.cc/api";

function mapFigure(figure: ChanjingDigitalHumanFigure): DigitalHumanFigure {
  return {
    type: figure.type,
    cover: figure.cover,
    width: figure.width,
    height: figure.height,
    previewVideoUrl: figure.preview_video_url,
    canReplaceBackground: figure.bg_replace,
  };
}

function mapDigitalHuman(item: ChanjingDigitalHumanItem): DigitalHumanAsset {
  return {
    id: item.id,
    name: item.name,
    gender: item.gender,
    figures: (item.figures ?? []).map(mapFigure),
    defaultVoice: item.audio_man_id
      ? {
          id: item.audio_man_id,
          name: item.audio_name ?? "Default Voice",
          language: item.audio_lang,
          auditionUrl: item.audio_preview,
        }
      : undefined,
    tags: item.tag_names ?? [],
    tagIds: item.tag_ids ?? [],
    supports4k: item.support_4k,
  };
}

function mapVoice(item: ChanjingVoiceItem): DigitalHumanVoiceOption {
  return {
    id: item.id,
    name: item.name,
    gender: item.gender,
    language: item.lang,
    speed: item.speed,
    pitch: item.pitch,
    auditionUrl: item.audition,
    description: item.desc,
  };
}

function mapStatus(data: ChanjingVideoDetail): DigitalHumanGenerationStatus {
  if (data.status === 30 && data.video_url) {
    return {
      status: "completed",
      progress: data.progress,
      url: data.video_url,
      previewUrl: data.preview_url,
      duration: data.duration,
      rawStatus: data.status,
    };
  }

  if (data.status >= 40) {
    return {
      status: "failed",
      progress: data.progress,
      error: data.msg || "Digital human generation failed",
      rawStatus: data.status,
    };
  }

  return {
    status: "pending",
    progress: data.progress,
    rawStatus: data.status,
  };
}

function computePlacement(
  videoResolution: { width: number; height: number },
  figure?: Pick<DigitalHumanFigure, "width" | "height">,
) {
  const sourceWidth = figure?.width || videoResolution.width;
  const sourceHeight = figure?.height || videoResolution.height;
  const scale = Math.min(
    videoResolution.width / sourceWidth,
    videoResolution.height / sourceHeight,
  );
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));

  return {
    x: Math.max(0, Math.round((videoResolution.width - width) / 2)),
    y: Math.max(0, Math.round((videoResolution.height - height) / 2)),
    width: width % 2 === 0 ? width : width - 1,
    height: height % 2 === 0 ? height : height - 1,
  };
}

export function createChanjingDigitalHumanService(
  options: CreateChanjingDigitalHumanServiceOptions,
): IDigitalHumanGenerationService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const request = async <T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    const headers = new Headers(init?.headers);

    if (options.getAccessToken) {
      const accessToken = await options.getAccessToken();
      if (accessToken) {
        headers.set("access_token", accessToken);
      }
    }

    if (init?.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const json = (await response.json()) as ChanjingApiResponse<T>;
    if (!response.ok || json.code !== 0) {
      throw new Error(json.msg || `Chanjing request failed: ${response.status}`);
    }

    return json.data;
  };

  return {
    pollingIntervalMs: options.pollingIntervalMs ?? 5000,
    listDigitalHumans: async (params?: ListDigitalHumansParams) => {
      const query = new URLSearchParams();
      query.set("page", String(params?.page ?? 1));
      query.set("size", String(params?.size ?? 24));
      if (params?.source !== undefined) {
        query.set("source", String(params.source));
      }
      if (params?.tagIds?.length) {
        query.set("tag_ids", params.tagIds.join(","));
      }

      const data = await request<ChanjingListResponse<ChanjingDigitalHumanItem>>(
        `/open/v1/list_common_dp?${query.toString()}`,
        { method: "GET" },
      );

      return (data.list ?? []).map(mapDigitalHuman);
    },
    listVoices: async () => {
      const data = await request<ChanjingListResponse<ChanjingVoiceItem>>(
        "/open/v1/list_common_audio?page=1&size=100",
        { method: "GET" },
      );

      return (data.list ?? []).map(mapVoice);
    },
    createVideo: async (params: CreateDigitalHumanVideoParams) => {
      const placement = computePlacement(params.videoResolution, {
        width: params.figureWidth ?? params.videoResolution.width,
        height: params.figureHeight ?? params.videoResolution.height,
      });

      return request<string>("/open/v1/create_video", {
        method: "POST",
        body: JSON.stringify({
          person: {
            id: params.digitalHumanId,
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            figure_type: params.figureType,
          },
          audio: {
            tts: {
              text: [params.script],
              speed: params.speed ?? 1,
              audio_man: params.voiceId,
            },
            wav_url: "",
            type: "tts",
            volume: 100,
            language: params.speechLanguage ?? "cn",
          },
          subtitle_config: {
            show: params.showSubtitles ?? true,
          },
          bg_color: params.backgroundColor ?? "#EDEDED",
          screen_width: params.videoResolution.width,
          screen_height: params.videoResolution.height,
          model: params.quality === "pro" ? 1 : 0,
          resolution_rate:
            params.videoResolution.width >= 2160 ||
            params.videoResolution.height >= 2160
              ? 1
              : 0,
        }),
      });
    },
    getRequestStatus: async (videoId: string) => {
      const data = await request<ChanjingVideoDetail>(
        `/open/v1/video?id=${encodeURIComponent(videoId)}`,
        { method: "GET" },
      );

      return mapStatus(data);
    },
  };
}

export function createChanjingAccessTokenProvider(
  options: CreateChanjingAccessTokenProviderOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  let cachedToken = "";
  let expireAt = 0;

  return async () => {
    const now = Date.now();
    if (cachedToken && now < expireAt - 60_000) {
      return cachedToken;
    }

    const response = await fetchImpl(`${baseUrl}/open/v1/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: options.appId,
        secret_key: options.secretKey,
      }),
    });

    const json = (await response.json()) as ChanjingApiResponse<{
      access_token: string;
      expire_in: number;
    }>;

    if (!response.ok || json.code !== 0) {
      throw new Error(json.msg || `Chanjing auth failed: ${response.status}`);
    }

    cachedToken = json.data.access_token;
    expireAt = (json.data.expire_in ?? Math.floor(now / 1000) + 3600) * 1000;
    return cachedToken;
  };
}

export function createChanjingAccessTokenProviderFromEndpoint(
  options: CreateChanjingAccessTokenProviderFromEndpointOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;

  return async () => {
    const response = await fetchImpl(options.tokenApiUrl, {
      method: "GET",
      ...(options.requestInit ?? {}),
    });

    const json = (await response.json().catch(() => ({}))) as
      | {
          accessToken?: string;
          access_token?: string;
          token?: string;
          data?:
            | string
            | {
                accessToken?: string;
                access_token?: string;
                token?: string;
              };
          msg?: string;
        }
      | undefined;

    if (!response.ok) {
      throw new Error(
        json?.msg || `Failed to fetch Chanjing access token: ${response.status}`,
      );
    }

    const token =
      json?.accessToken ||
      json?.access_token ||
      json?.token ||
      (typeof json?.data === "string"
        ? json.data
        : json?.data?.accessToken ||
          json?.data?.access_token ||
          json?.data?.token);

    if (!token) {
      throw new Error("Token endpoint did not return an access token");
    }

    return token;
  };
}
