export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  message: string;
  level: NotificationLevel;
};

type NotificationCenterProps = {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
};

export default function NotificationCenter({ notifications, onDismiss }: NotificationCenterProps) {
  if (!notifications.length) return null;

  return (
    <aside
      className="notification-center"
      aria-label="System notifications"
      role="region"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className={`notification-item level-${notification.level}`}
          role={notification.level === 'error' || notification.level === 'warning' ? 'alert' : 'status'}
          aria-atomic="true"
        >
          <p>{notification.message}</p>
          <button
            className="ghost-button notification-dismiss"
            type="button"
            onClick={() => onDismiss(notification.id)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </article>
      ))}
    </aside>
  );
}
