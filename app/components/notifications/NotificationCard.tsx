"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { NotificationType } from "@prisma/client";
import { Button } from "@/app/components/ui/Button";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: any;
  createdAt: string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "ANALYSIS_COMPLETE":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
    case "NEW_MESSAGE":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-5 w-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
      );
    case "TEAM_INVITATION":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
          <svg
            className="h-5 w-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      );
    case "ACHIEVEMENT_UNLOCKED":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
      );
    case "SESSION_REMINDER":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-5 w-5 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
    case "CONSENT_REQUEST":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      );
    case "SYSTEM_ALERT":
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
      );
  }
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationCardProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        notification.isRead
          ? "border-[var(--surface-secondary)] bg-[var(--surface)]"
          : "border-blue-200 bg-blue-50/50"
      }`}
    >
      <div className="flex gap-4">
        {getNotificationIcon(notification.type)}
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {notification.title}
                </h3>
                {!notification.isRead && (
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                {timeAgo}
              </p>
            </div>
            
            <button
              onClick={() => onDelete(notification.id)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              aria-label="Delete notification"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {(notification.actionUrl || !notification.isRead) && (
            <div className="mt-3 flex gap-2">
              {notification.actionUrl && (
                <Link href={notification.actionUrl}>
                  <Button size="sm" variant="primary">
                    View
                  </Button>
                </Link>
              )}
              {!notification.isRead && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  Mark as read
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
