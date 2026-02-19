export type AppLocale = 'en' | 'es';

export type AppCopyKey =
  | 'setup_support_title'
  | 'open_setup_wizard'
  | 'open_support_panel'
  | 'telemetry_summary_title'
  | 'telemetry_summary_body'
  | 'export_event_queue'
  | 'settings_center_title'
  | 'settings_center_body'
  | 'safe_export'
  | 'gamepad_enabled'
  | 'timeline_windowing'
  | 'theme_label'
  | 'motion_label'
  | 'app_language_label'
  | 'gameplay_locale_label'
  | 'traceql_placeholder'
  | 'run_traceql'
  | 'clear_traceql'
  | 'select_extension'
  | 'run_extension'
  | 'running_extension'
  | 'mode_cinema'
  | 'mode_flow'
  | 'mode_compare'
  | 'mode_matrix'
  | 'mode_gameplay'
  | 'windowed'
  | 'overlay'
  | 'sync_playback'
  | 'loading_view'
  | 'loading_panel';

const APP_COPY: Record<AppLocale, Record<AppCopyKey, string>> = {
  en: {
    setup_support_title: 'Setup + support',
    open_setup_wizard: 'Open setup wizard',
    open_support_panel: 'Open support panel',
    telemetry_summary_title: 'Telemetry summary',
    telemetry_summary_body: 'Product events are captured in local analytics queue for pre-release UX audits.',
    export_event_queue: 'Export event queue',
    settings_center_title: 'Settings center',
    settings_center_body: 'Centralized controls for input, UX behavior, and safe sharing defaults.',
    safe_export: 'Safe export',
    gamepad_enabled: 'Gamepad enabled',
    timeline_windowing: 'Timeline windowing',
    theme_label: 'Theme',
    motion_label: 'Motion',
    app_language_label: 'App language',
    gameplay_locale_label: 'Gameplay locale',
    traceql_placeholder: 'TraceQL (example: type=tool_call and duration_ms>800)',
    run_traceql: 'Run TraceQL',
    clear_traceql: 'Clear TraceQL',
    select_extension: 'Select extension',
    run_extension: 'Run extension',
    running_extension: 'Running extension...',
    mode_cinema: 'Cinema',
    mode_flow: 'Flow',
    mode_compare: 'Compare',
    mode_matrix: 'Matrix',
    mode_gameplay: 'Gameplay',
    windowed: 'Windowed',
    overlay: 'Overlay',
    sync_playback: 'Sync playback',
    loading_view: 'Loading view...',
    loading_panel: 'Loading panel...',
  },
  es: {
    setup_support_title: 'Configuracion y soporte',
    open_setup_wizard: 'Abrir asistente de configuracion',
    open_support_panel: 'Abrir panel de soporte',
    telemetry_summary_title: 'Resumen de telemetria',
    telemetry_summary_body: 'Los eventos de producto se guardan en una cola local para auditorias UX de pre-lanzamiento.',
    export_event_queue: 'Exportar cola de eventos',
    settings_center_title: 'Centro de configuracion',
    settings_center_body: 'Controles centralizados para entradas, UX y opciones seguras de comparticion.',
    safe_export: 'Exportacion segura',
    gamepad_enabled: 'Gamepad habilitado',
    timeline_windowing: 'Ventana de timeline',
    theme_label: 'Tema',
    motion_label: 'Movimiento',
    app_language_label: 'Idioma de la app',
    gameplay_locale_label: 'Idioma de gameplay',
    traceql_placeholder: 'TraceQL (ejemplo: type=tool_call and duration_ms>800)',
    run_traceql: 'Ejecutar TraceQL',
    clear_traceql: 'Limpiar TraceQL',
    select_extension: 'Seleccionar extension',
    run_extension: 'Ejecutar extension',
    running_extension: 'Ejecutando extension...',
    mode_cinema: 'Cine',
    mode_flow: 'Flujo',
    mode_compare: 'Comparar',
    mode_matrix: 'Matriz',
    mode_gameplay: 'Gameplay',
    windowed: 'En ventana',
    overlay: 'Superposicion',
    sync_playback: 'Sincronizar reproduccion',
    loading_view: 'Cargando vista...',
    loading_panel: 'Cargando panel...',
  },
};

export const APP_LOCALE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
];

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if (value === 'es') return 'es';
  return 'en';
}

export function appLabel(locale: AppLocale, key: AppCopyKey): string {
  return APP_COPY[locale]?.[key] ?? APP_COPY.en[key];
}
