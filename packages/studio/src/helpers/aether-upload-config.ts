import type { UploadConfig } from "../types";

export const DEFAULT_AETHER_BFF_BASE_URL = "http://localhost:48080";
const DEFAULT_UPLOAD_API_URL = `${DEFAULT_AETHER_BFF_BASE_URL}/api/third-party/file/upload`;
const DEFAULT_IMPORT_API_URL = `${DEFAULT_AETHER_BFF_BASE_URL}/api/third-party/file/import`;
const DEFAULT_DIRECTORY = "third-party-demo/imports";
const DEFAULT_QUERY_KEYS = ["userToken", "user_token", "ut"] as const;

export interface EmbeddedAetherUploadOptions {
  apiKey: string;
  directory?: string;
  uploadApiUrl?: string;
  importApiUrl?: string;
  queryKeys?: string[];
  search?: string;
}

export function getAetherUserTokenFromQuery(
  search =
    typeof window === "undefined" ? "" : window.location.search,
  queryKeys: string[] = [...DEFAULT_QUERY_KEYS],
): string | undefined {
  const params = new URLSearchParams(search);

  for (const key of queryKeys) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function createEmbeddedAetherUploadConfig(
  options: EmbeddedAetherUploadOptions,
): UploadConfig | undefined {
  const userToken = getAetherUserTokenFromQuery(
    options.search,
    options.queryKeys,
  );

  if (!userToken) {
    return undefined;
  }

  return {
    provider: "aether",
    uploadApiUrl: options.uploadApiUrl ?? DEFAULT_UPLOAD_API_URL,
    importApiUrl: options.importApiUrl ?? DEFAULT_IMPORT_API_URL,
    directory: options.directory ?? DEFAULT_DIRECTORY,
    apiKey: options.apiKey,
    userToken,
  };
}

export function getChanjingTokenApiUrlFromUploadConfig(
  uploadApiUrl = DEFAULT_UPLOAD_API_URL,
): string {
  const apiBaseUrl = uploadApiUrl.replace(/\/api\/third-party\/file\/upload$/, "");
  return `${apiBaseUrl}/api/third-party/chanjing/access-token`;
}

export function getChanjingProxyBaseUrlFromUploadConfig(
  uploadApiUrl = DEFAULT_UPLOAD_API_URL,
): string {
  const apiBaseUrl = uploadApiUrl.replace(/\/api\/third-party\/file\/upload$/, "");
  return `${apiBaseUrl}/api/third-party/chanjing`;
}
