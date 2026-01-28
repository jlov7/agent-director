const LogoMark = () => (
  <svg
    className="logo-mark"
    width="54"
    height="54"
    viewBox="0 0 120 120"
    role="img"
    aria-label="Agent Director logo"
  >
    <rect x="8" y="8" width="104" height="104" rx="18" className="logo-frame" />
    <rect x="24" y="28" width="72" height="16" rx="6" className="logo-bar logo-bar-a" />
    <rect x="24" y="52" width="72" height="16" rx="6" className="logo-bar logo-bar-b" />
    <rect x="24" y="76" width="72" height="16" rx="6" className="logo-bar logo-bar-c" />
    <circle cx="96" cy="36" r="6" className="logo-node logo-node-a" />
    <circle cx="96" cy="60" r="6" className="logo-node logo-node-b" />
    <circle cx="96" cy="84" r="6" className="logo-node logo-node-c" />
  </svg>
);

export default LogoMark;
