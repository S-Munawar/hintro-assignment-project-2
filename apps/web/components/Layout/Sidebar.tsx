"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBoardStore } from "@/store/useBoardStore";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Kanban,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { logoutUser, userName } = useAuth();
  const { boards, fetchBoards, boardsLoading } = useBoardStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchBoards(1, 50);
  }, [fetchBoards]);

  const isActive = (path: string) => pathname === path;
  const isBoardActive = (id: string) => pathname === `/board/${id}`;

  return (
    <aside
      className={`flex flex-col h-screen shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Brand */}
      <div
        className={`flex items-center ${collapsed ? "justify-center px-3" : "justify-between px-5"} py-5 border-b`}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Link href="/" className={`flex items-center gap-2.5 ${collapsed ? "" : ""}`}>
          <div className="p-1.5 bg-indigo-600 rounded-lg shrink-0">
            <Kanban size={18} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white">Hintro</span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="Collapse sidebar"
            type="button"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Expand toggle when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-3">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="Expand sidebar"
            type="button"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"} py-4 space-y-1`}>
        <Link
          href="/"
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
            ${isActive("/")
              ? "bg-indigo-600/20 text-indigo-300"
              : "text-slate-400 hover:text-white hover:bg-white/5"}`}
          title={collapsed ? "Dashboard" : undefined}
        >
          <LayoutDashboard size={18} className="shrink-0" />
          {!collapsed && "Dashboard"}
        </Link>

        {/* Boards section */}
        <div className="pt-6">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sidebar-border)" }}>
                Your Boards
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/5" style={{ color: "var(--sidebar-text)" }}>
                {boards.length}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {boardsLoading && boards.length === 0 ? (
              <div className={`space-y-2 ${collapsed ? "px-1" : "px-3"}`}>
                <div className="h-8 skeleton opacity-10 rounded-lg" />
                {!collapsed && <div className="h-8 skeleton opacity-10 rounded-lg w-3/4" />}
              </div>
            ) : boards.length === 0 ? (
              !collapsed && (
                <div className="px-3 py-3 text-xs rounded-lg bg-white/[0.03]" style={{ color: "var(--sidebar-border)" }}>
                  No boards yet. Create your first one!
                </div>
              )
            ) : (
              boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className={`group flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm transition-all duration-150
                    ${isBoardActive(board.id)
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  title={collapsed ? board.name : undefined}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0 ring-1 ring-white/10"
                    style={{ backgroundColor: board.color }}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1">{board.name}</span>
                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-opacity ${
                          isBoardActive(board.id) ? "opacity-60" : "opacity-0 group-hover:opacity-40"
                        }`}
                      />
                    </>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className={`border-t ${collapsed ? "p-2" : "p-3"} space-y-0.5`} style={{ borderColor: "var(--sidebar-border)" }}>
        <Link
          href="/settings"
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm transition-all duration-150
            ${isActive("/settings")
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"}`}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        <button
          onClick={logoutUser}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 w-full transition-all duration-150`}
          title={collapsed ? "Sign Out" : undefined}
          type="button"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className="avatar avatar-sm bg-indigo-600/30 text-indigo-300 text-[10px]">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span className="text-xs truncate" style={{ color: "var(--sidebar-border)" }}>{userName}</span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pt-2" title={userName ?? undefined}>
            <div className="avatar avatar-sm bg-indigo-600/30 text-indigo-300 text-[10px]">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
