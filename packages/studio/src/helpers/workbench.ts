import type { MediaItem } from "@twick/video-editor";
import {
  ImageElement,
  TRACK_TYPES,
  VideoElement,
  type ProjectJSON,
  type ProjectMetadata,
  type Size,
  type TimelineEditor,
  type TrackElement,
} from "@twick/timeline";
import type { StudioWorkbenchConfig } from "../types";

export const WORKBENCH_PROJECT_KIND = "digital-human-sales" as const;
export const WORKBENCH_PROJECT_METADATA_KEY = "workbench";
export const WORKBENCH_ROLE_AVATAR = "avatar" as const;
export const WORKBENCH_ROLE_BACKGROUND = "background" as const;

export type WorkbenchRole =
  | typeof WORKBENCH_ROLE_AVATAR
  | typeof WORKBENCH_ROLE_BACKGROUND;

export interface WorkbenchProjectMetadata {
  kind: typeof WORKBENCH_PROJECT_KIND;
  stepId?: "studio" | "iterate";
  baselineResultId?: string;
  sourceProjectDraftUrl?: string;
  avatarId?: string;
  backgroundId?: string;
  backgroundAssetType?: "image" | "video";
  selectedFigureType?: string;
  selectedVoiceId?: string;
  speechLanguage?: "cn" | "en";
  quality?: "standard" | "pro";
  speed?: number;
  showSubtitles?: boolean;
  backgroundColor?: string;
  scriptSnapshot?: string;
}

type CustomMetadata = ProjectMetadata["custom"] & {
  [WORKBENCH_PROJECT_METADATA_KEY]?: WorkbenchProjectMetadata;
};

function ensureProjectMetadata(metadata?: ProjectMetadata): ProjectMetadata {
  return {
    ...(metadata ?? {}),
    custom: {
      ...(metadata?.custom ?? {}),
    },
  };
}

export function getWorkbenchProjectMetadata(
  metadata?: ProjectMetadata | null,
): WorkbenchProjectMetadata | undefined {
  const custom = metadata?.custom as CustomMetadata | undefined;
  const workbench = custom?.[WORKBENCH_PROJECT_METADATA_KEY];
  if (!workbench || workbench.kind !== WORKBENCH_PROJECT_KIND) {
    return undefined;
  }
  return workbench;
}

export function mergeWorkbenchProjectMetadata(
  metadata: ProjectMetadata | undefined,
  patch: Partial<WorkbenchProjectMetadata>,
): ProjectMetadata {
  const nextMetadata = ensureProjectMetadata(metadata);
  const current = getWorkbenchProjectMetadata(nextMetadata) ?? {
    kind: WORKBENCH_PROJECT_KIND,
  };

  (nextMetadata.custom as CustomMetadata)[WORKBENCH_PROJECT_METADATA_KEY] = {
    ...current,
    ...patch,
    kind: WORKBENCH_PROJECT_KIND,
  };

  return nextMetadata;
}

export function withWorkbenchProjectMetadata(
  project: ProjectJSON,
  patch: Partial<WorkbenchProjectMetadata>,
): ProjectJSON {
  return {
    ...project,
    metadata: mergeWorkbenchProjectMetadata(project.metadata, patch),
  };
}

export function deriveWorkbenchBackgroundId(item: MediaItem): string {
  return item.id || item.providerId || item.url;
}

export function createWorkbenchElementMetadata(
  role: WorkbenchRole,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    workbenchRole: role,
    ...(extra ?? {}),
  };
}

export function getWorkbenchProjectMetadataFromProject(
  project?: ProjectJSON | null,
): WorkbenchProjectMetadata | undefined {
  return getWorkbenchProjectMetadata(project?.metadata);
}

export function isDigitalHumanSalesWorkbench(
  workbench?: StudioWorkbenchConfig,
): workbench is StudioWorkbenchConfig {
  return workbench?.kind === WORKBENCH_PROJECT_KIND;
}

function isWorkbenchRole(
  element: Readonly<TrackElement>,
  role: WorkbenchRole,
): boolean {
  return element.getMetadata()?.workbenchRole === role;
}

async function createBackgroundElement(params: {
  item: MediaItem;
  videoResolution: Size;
  durationSec: number;
  backgroundId: string;
}): Promise<TrackElement> {
  const { item, videoResolution, durationSec, backgroundId } = params;
  const metadata = createWorkbenchElementMetadata(WORKBENCH_ROLE_BACKGROUND, {
    backgroundId,
  });

  if (item.type === "video") {
    const element = new VideoElement(item.url, videoResolution);
    await element.updateVideoMeta();
    element
      .setName("workbench-background")
      .setStart(0)
      .setEnd(durationSec)
      .setObjectFit("cover")
      .setFrame({
        x: 0,
        y: 0,
        size: [videoResolution.width, videoResolution.height],
      })
      .setVolume(0)
      .setMetadata(metadata);
    return element;
  }

  const element = new ImageElement(item.url, videoResolution);
  await element.updateImageMeta();
  element
    .setName("workbench-background")
    .setStart(0)
    .setEnd(durationSec)
    .setObjectFit("cover")
    .setFrame({
      x: 0,
      y: 0,
      size: [videoResolution.width, videoResolution.height],
    })
    .setMetadata(metadata);
  return element;
}

export async function setMediaItemAsWorkbenchBackground(params: {
  editor: TimelineEditor;
  item: MediaItem;
  videoResolution: Size;
  durationSec?: number;
}): Promise<string> {
  const { editor, item, videoResolution } = params;
  const durationSec = Math.max(params.durationSec ?? 0, 5);
  const backgroundId = deriveWorkbenchBackgroundId(item);
  const tracks = editor.getTimelineData()?.tracks ?? [];
  const existingBackgroundElements = tracks.flatMap((track) =>
    track
      .getElements()
      .filter((element) => isWorkbenchRole(element, WORKBENCH_ROLE_BACKGROUND)),
  );

  for (const element of existingBackgroundElements) {
    editor.removeElement(element as TrackElement);
  }

  const track = editor.upsertTrack({
    id: "t-workbench-background",
    name: "Workbench Background",
    type: TRACK_TYPES.SCENE,
  });

  const element = await createBackgroundElement({
    item,
    videoResolution,
    durationSec,
    backgroundId,
  });

  await editor.addElementToTrack(track, element);
  editor.setMetadata(
    mergeWorkbenchProjectMetadata(editor.getMetadata(), {
      backgroundId,
      backgroundAssetType: item.type === "video" ? "video" : "image",
    }),
  );

  return backgroundId;
}
