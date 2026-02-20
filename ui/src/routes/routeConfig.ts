export const UX_REBOOT_ROUTES = ['overview', 'triage', 'diagnose', 'coordinate', 'settings'] as const;

export type UxRebootRoute = (typeof UX_REBOOT_ROUTES)[number];

export const DEFAULT_UX_REBOOT_ROUTE: UxRebootRoute = 'overview';
export const UX_REBOOT_ROUTE_QUERY_KEY = 'route';
export const UX_REBOOT_SHELL_QUERY_KEY = 'routes';
export const UX_REBOOT_SHELL_STORAGE_KEY = 'agentDirector.uxReboot.routes.v1';

export type UxRebootRouteDefinition = {
  id: UxRebootRoute;
  label: string;
  intent: string;
};

export const UX_REBOOT_ROUTE_DEFINITIONS: UxRebootRouteDefinition[] = [
  { id: 'overview', label: 'Overview', intent: 'Understand status quickly.' },
  { id: 'triage', label: 'Triage', intent: 'Resolve the most urgent issue.' },
  { id: 'diagnose', label: 'Diagnose', intent: 'Perform deep analysis.' },
  { id: 'coordinate', label: 'Coordinate', intent: 'Align team responders.' },
  { id: 'settings', label: 'Settings', intent: 'Configure workspace defaults.' },
];

export function parseUxRebootRoute(value: string | null | undefined): UxRebootRoute {
  if (!value) return DEFAULT_UX_REBOOT_ROUTE;
  const normalized = value.trim().toLowerCase();
  return UX_REBOOT_ROUTES.includes(normalized as UxRebootRoute)
    ? (normalized as UxRebootRoute)
    : DEFAULT_UX_REBOOT_ROUTE;
}
