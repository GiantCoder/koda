"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/common/LoadingSpinner";
import { EmptyState } from "@/app/components/common/EmptyState";
import { NotificationCard } from "@/app/components/notifications/NotificationCard";
import { NotificationType } from "@prisma/client";

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

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }
      await fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }
      await fetchNotifications();
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      await fetchNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent>
            <p className="text-center text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasUnread = (data?.unreadCount ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Notifications
          </h1>
          {hasUnread && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              You have {data?.unreadCount} unread notification
              {data?.unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {hasUnread && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            variant="secondary"
            className="text-sm"
          >
            {markingAllRead ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>

      {!data?.notifications || data.notifications.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
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
          }
          title="No notifications"
          description="You're all caught up! Check back later for updates."
        />
      ) : (
        <div className="space-y-3">
          {data.notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
