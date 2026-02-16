"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import type { ActivityLogEntry } from "@/types";
import { Clock, ArrowRightLeft, Plus, Pencil, Trash2, UserPlus, UserMinus } from "lucide-react";

interface ActivityLogProps {
  boardId: string;
  taskId?: string;
}

export default function ActivityLog({ boardId, taskId }: ActivityLogProps) {
  const { activityLogs, activityLoading, fetchActivity } = useTaskStore();

  useEffect(() => {
    fetchActivity(boardId, taskId);
  }, [boardId, taskId, fetchActivity]);

  if (activityLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activityLogs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
          <Clock size={18} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activityLogs.map((log, idx) => (
        <ActivityItem key={log.id} log={log} isLast={idx === activityLogs.length - 1} />
      ))}
    </div>
  );
}

function ActivityItem({ log, isLast }: { log: ActivityLogEntry; isLast: boolean }) {
  const actionLabel = getActionLabel(log);
  const timeAgo = formatTimeAgo(log.created_at);
  const ActionIcon = getActionIcon(log);

  return (
    <div className="flex gap-3 text-sm relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-9 bottom-0 w-px bg-slate-100" />
      )}
      <div className="avatar avatar-sm bg-slate-100 text-slate-500 shrink-0 mt-0.5 z-10">
        {log.user.first_name?.[0] ?? "?"}
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-800">{log.user.first_name} {log.user.last_name}</span>{" "}
          {actionLabel}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <ActionIcon size={10} />
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

function getActionIcon(log: ActivityLogEntry) {
  const changes = log.changes as Record<string, unknown> | null;
  switch (log.action_type) {
    case "create":
      if (changes?.action === "member_added" || changes?.action === "user_assigned") return UserPlus;
      return Plus;
    case "update":
      if (changes?.action === "moved") return ArrowRightLeft;
      return Pencil;
    case "delete":
      if (changes?.action === "member_removed" || changes?.action === "user_unassigned") return UserMinus;
      return Trash2;
    case "move":
      return ArrowRightLeft;
    default:
      return Clock;
  }
}

function getActionLabel(log: ActivityLogEntry): string {
  const changes = log.changes as Record<string, unknown> | null;
  const entity = log.entity_type;

  switch (log.action_type) {
    case "create":
      if (changes?.action === "member_added") return "added a member";
      if (changes?.action === "user_assigned") return "assigned a user";
      return `created a ${entity}`;
    case "update":
      if (changes?.action === "moved") {
        return `moved task from "${changes.from_list}" to "${changes.to_list}"`;
      }
      return `updated a ${entity}`;
    case "delete":
      if (changes?.action === "member_removed") return "removed a member";
      if (changes?.action === "user_unassigned") return "unassigned a user";
      return `deleted a ${entity}`;
    case "move":
      return `moved a ${entity}`;
    default:
      return `performed an action on ${entity}`;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
