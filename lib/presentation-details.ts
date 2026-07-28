import type { DisplaySettings, EdgeDisplaySettings } from "@/lib/types"
import {
  defaultDisplaySettings,
  defaultEdgeDisplaySettings,
} from "@/lib/utils/compromise-canvas-constants"

const enableEverySetting = <T extends object>(
  settings: T,
): T =>
  Object.fromEntries(
    Object.keys(settings).map((key) => [key, true]),
  ) as T

export const presentationNodeDisplaySettings: DisplaySettings =
  enableEverySetting(defaultDisplaySettings)

export const presentationEdgeDisplaySettings: EdgeDisplaySettings =
  enableEverySetting(defaultEdgeDisplaySettings)
