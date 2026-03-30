export type DigitalHumanWorkbenchStepId = "studio" | "iterate";
export type DigitalHumanWorkbenchPhase = "initial" | "iteration";

export interface DigitalHumanWorkbenchInitPayload {
  trainingKey: string;
  sessionId: string;
  attemptId: string;
  stepId: DigitalHumanWorkbenchStepId;
  taskType: "short-video";
  productContext: {
    brand: Record<string, unknown>;
    product: Record<string, unknown>;
    resources: Array<Record<string, unknown>>;
    deliverables: string[];
    roughCutRequirements: string[];
  };
  scriptContext: {
    strategy: "single-scent" | "series-comparison";
    selectedScents: string[];
    rolePersona: string;
    sceneSummary: string;
    scriptVersionLabel: string;
    openingHook: string;
    coreScriptDraft: string;
    ctaLine: string;
    fullScript: string;
  };
  existingConfig?: {
    resultId?: string;
    videoUrl?: string;
    projectDraftUrl?: string;
    avatarId?: string;
    backgroundId?: string;
  };
}

export interface DigitalHumanWorkbenchSavePayload {
  resultId: string;
  phase: DigitalHumanWorkbenchPhase;
  avatarId?: string;
  backgroundId?: string;
  videoUrl: string;
  projectDraftUrl: string;
  scriptSnapshot?: string;
  thumbnailUrl?: string;
  returnedAt?: string;
  roughCutChecklist?: {
    captions?: boolean;
    music?: boolean;
    trimSilence?: boolean;
  };
}

export interface DigitalHumanWorkbenchErrorPayload {
  message: string;
}

export interface DigitalHumanWorkbenchInitMessage {
  type: "digitalHumanWorkbench.init";
  payload: DigitalHumanWorkbenchInitPayload;
}

export interface DigitalHumanWorkbenchReadyMessage {
  type: "digitalHumanWorkbench.ready";
}

export interface DigitalHumanWorkbenchSaveMessage {
  type: "digitalHumanWorkbench.save";
  payload: DigitalHumanWorkbenchSavePayload;
}

export interface DigitalHumanWorkbenchErrorMessage {
  type: "digitalHumanWorkbench.error";
  payload: DigitalHumanWorkbenchErrorPayload;
}

export interface DigitalHumanWorkbenchCloseMessage {
  type: "digitalHumanWorkbench.close";
}

export type DigitalHumanWorkbenchInboundMessage =
  | DigitalHumanWorkbenchInitMessage;

export type DigitalHumanWorkbenchOutboundMessage =
  | DigitalHumanWorkbenchReadyMessage
  | DigitalHumanWorkbenchSaveMessage
  | DigitalHumanWorkbenchErrorMessage
  | DigitalHumanWorkbenchCloseMessage;

export function isDigitalHumanWorkbenchInitMessage(
  value: unknown,
): value is DigitalHumanWorkbenchInitMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;
  if (message.type !== "digitalHumanWorkbench.init") {
    return false;
  }

  const payload = message.payload as Record<string, unknown> | undefined;
  return (
    Boolean(payload) &&
    typeof payload?.trainingKey === "string" &&
    typeof payload?.sessionId === "string" &&
    typeof payload?.attemptId === "string" &&
    (payload?.stepId === "studio" || payload?.stepId === "iterate")
  );
}
