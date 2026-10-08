import {
  DEFAULT_MAINTENANCE_DEFAULTS,
  DEFAULT_SETTINGS,
  type MaintenanceDefaults,
  type MaintenanceRule,
  type UserSettings,
} from '../types/index.js';

/**
 * Merge a raw Firestore settings document with app defaults.
 * Also folds the legacy `maintenanceDefaults.wingHarness` field into both
 * wing and harness rules so older imports still render.
 */
export function mergeSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const source = raw ?? {};
  const legacy = (
    source.maintenanceDefaults as
      | (Partial<MaintenanceDefaults> & { wingHarness?: MaintenanceRule })
      | undefined
  )?.wingHarness;

  return {
    ...DEFAULT_SETTINGS,
    ...source,
    pilot: { ...DEFAULT_SETTINGS.pilot, ...source.pilot },
    defaults: { ...DEFAULT_SETTINGS.defaults, ...source.defaults },
    maintenanceDefaults: {
      wing: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.wing,
        ...legacy,
        ...source.maintenanceDefaults?.wing,
      },
      harness: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.harness,
        ...legacy,
        ...source.maintenanceDefaults?.harness,
      },
      reserve: {
        ...DEFAULT_MAINTENANCE_DEFAULTS.reserve,
        ...source.maintenanceDefaults?.reserve,
      },
    },
  };
}
