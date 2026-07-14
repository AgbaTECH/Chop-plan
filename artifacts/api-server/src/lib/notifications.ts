// Preset pickup-notification messages a vendor can send to a customer about
// a specific order. The server (not the client) owns the canonical text for
// every preset — this prevents a client from spoofing a "custom" message
// under a preset's label, and means copy stays consistent everywhere.
export const NOTIFICATION_PRESETS = {
  ready: "Your order is ready for pickup!",
  delayed_10: "Your order is delayed by about 10 minutes. Thanks for your patience!",
  delayed_20: "Your order is delayed by about 20 minutes. Thanks for your patience!",
} as const;

export type PresetType = keyof typeof NOTIFICATION_PRESETS | "custom";

export const PRESET_TYPES: PresetType[] = [...Object.keys(NOTIFICATION_PRESETS), "custom"] as PresetType[];

export const MAX_CUSTOM_MESSAGE_LENGTH = 300;

/**
 * Resolve the canonical message for a notification. For known presets this
 * always returns the server-owned text (ignoring anything the client sent).
 * For "custom" it validates and returns the client-supplied message.
 */
export function resolveNotificationMessage(
  presetType: string,
  customMessage: unknown
): { ok: true; message: string } | { ok: false; error: string } {
  if (presetType === "custom") {
    if (typeof customMessage !== "string" || customMessage.trim().length === 0) {
      return { ok: false, error: "A custom message is required when presetType is 'custom'" };
    }
    if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
      return { ok: false, error: `Custom message must be ${MAX_CUSTOM_MESSAGE_LENGTH} characters or fewer` };
    }
    return { ok: true, message: customMessage.trim() };
  }
  const preset = (NOTIFICATION_PRESETS as Record<string, string>)[presetType];
  if (!preset) {
    return { ok: false, error: `Invalid presetType. Must be one of: ${PRESET_TYPES.join(", ")}` };
  }
  return { ok: true, message: preset };
}
