import App from '../App';
import {
  DEFAULT_UX_REBOOT_ROUTE,
  UX_REBOOT_ROUTE_DEFINITIONS,
  UX_REBOOT_ROUTE_QUERY_KEY,
  UX_REBOOT_SHELL_QUERY_KEY,
  UX_REBOOT_SHELL_STORAGE_KEY,
  parseUxRebootRoute,
} from './routeConfig';

const ROUTE_ENV_FLAG_ENABLED =
  import.meta.env.MODE === 'test'
    ? import.meta.env.VITE_UX_REBOOT_ROUTES === '1'
    : import.meta.env.VITE_UX_REBOOT_ROUTES !== '0';

function readStorageRouteShellFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(UX_REBOOT_SHELL_STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function readRouteShellFromUrl(): { enabled: boolean; route: string | null } {
  if (typeof window === 'undefined') {
    return { enabled: false, route: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    enabled: params.get(UX_REBOOT_SHELL_QUERY_KEY) === '1',
    route: params.get(UX_REBOOT_ROUTE_QUERY_KEY),
  };
}

function resolveRouteShellState() {
  const fromUrl = readRouteShellFromUrl();
  const enabled = ROUTE_ENV_FLAG_ENABLED || fromUrl.enabled || readStorageRouteShellFlag();
  const activeRoute = parseUxRebootRoute(fromUrl.route ?? DEFAULT_UX_REBOOT_ROUTE);
  return { enabled, activeRoute };
}

export default function RouteReadyShell() {
  const shell = resolveRouteShellState();

  if (!shell.enabled) {
    return <App />;
  }

  return (
    <div className="route-ready-shell" data-route-shell="enabled" data-active-route={shell.activeRoute}>
      <nav className="sr-only" aria-label="UX reboot routes">
        {UX_REBOOT_ROUTE_DEFINITIONS.map((route) => (
          <a key={route.id} href={`/?${UX_REBOOT_ROUTE_QUERY_KEY}=${route.id}&${UX_REBOOT_SHELL_QUERY_KEY}=1`}>
            {route.label}
          </a>
        ))}
      </nav>
      <App />
    </div>
  );
}
