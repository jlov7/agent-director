export type GameplayLocale = 'en' | 'es';

export type GameplayLabelKey =
  | 'input_resilience_title'
  | 'connectivity_online'
  | 'connectivity_offline'
  | 'locale_label'
  | 'gamepad_preset_label'
  | 'toggle_gamepad_on'
  | 'toggle_gamepad_off'
  | 'retry_sync'
  | 'controller_hint';

const GAMEPLAY_LABELS: Record<GameplayLocale, Record<GameplayLabelKey, string>> = {
  en: {
    input_resilience_title: '16) Input + Localization + Resilience',
    connectivity_online: 'Connectivity: online',
    connectivity_offline: 'Connectivity: offline',
    locale_label: 'Locale',
    gamepad_preset_label: 'Gamepad preset',
    toggle_gamepad_on: 'Disable gamepad controls',
    toggle_gamepad_off: 'Enable gamepad controls',
    retry_sync: 'Retry sync',
    controller_hint: 'Controller maps support palette, mode cycle, playback, and speed tuning.',
  },
  es: {
    input_resilience_title: '16) Entrada + Localizacion + Resiliencia',
    connectivity_online: 'Conectividad: en linea',
    connectivity_offline: 'Conectividad: sin conexion',
    locale_label: 'Idioma',
    gamepad_preset_label: 'Perfil de mando',
    toggle_gamepad_on: 'Desactivar mando',
    toggle_gamepad_off: 'Activar mando',
    retry_sync: 'Reintentar sincronizacion',
    controller_hint: 'El mando controla paleta, cambio de modo, reproduccion y velocidad.',
  },
};

export function gameplayLabel(locale: GameplayLocale, key: GameplayLabelKey): string {
  return GAMEPLAY_LABELS[locale]?.[key] ?? GAMEPLAY_LABELS.en[key];
}
