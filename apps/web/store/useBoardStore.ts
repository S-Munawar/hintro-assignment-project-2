"use client";

import { create } from "zustand";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type {
  BoardSummary,
  BoardDetail,
  BoardCreated,
  BoardMember,
  List,
  ListWithTasks,
  Pagination,
} from "@/types";

interface BoardState {
  /* ── Dashboard ──────────────────────────────────────────────────── */
  boards: BoardSummary[];
  boardsPagination: Pagination | null;
  boardsLoading: boolean;

  /* ── Current Board ──────────────────────────────────────────────── */
  currentBoard: BoardDetail | null;
  currentBoardLoading: boolean;

  /* ── Actions: Boards ────────────────────────────────────────────── */
  fetchBoards: (page?: number, limit?: number) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (data: { name: string; description?: string; color?: string }) => Promise<BoardCreated>;
  updateBoard: (boardId: string, data: { name?: string; description?: string | null; color?: string; is_archived?: boolean }) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  /* ── Actions: Members ───────────────────────────────────────────── */
  addMember: (boardId: string, userId: string, role?: string) => Promise<BoardMember>;
  removeMember: (boardId: string, userId: string) => Promise<void>;

  /* ── Actions: Lists ─────────────────────────────────────────────── */
  createList: (boardId: string, name: string) => Promise<List>;
  updateList: (boardId: string, listId: string, data: { name?: string; position?: number }) => Promise<void>;
  deleteList: (boardId: string, listId: string) => Promise<void>;

  /* ── Optimistic helpers ─────────────────────────────────────────── */
  optimisticMoveTask: (taskId: string, fromListId: string, toListId: string, newPosition: number) => void;
  clearCurrentBoard: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  boards: [],
  boardsPagination: null,
  boardsLoading: false,
  currentBoard: null,
  currentBoardLoading: false,

  // ── Boards ─────────────────────────────────────────────────────────

  fetchBoards: async (page = 1, limit = 20) => {
    set({ boardsLoading: true });
    try {
      const res = await apiGet<BoardSummary[]>("/boards", { page, limit });
      set({ boards: res.data, boardsPagination: res.pagination ?? null });
    } finally {
      set({ boardsLoading: false });
    }
  },

  fetchBoard: async (boardId) => {
    set({ currentBoardLoading: true });
    try {
      const res = await apiGet<BoardDetail>(`/boards/${boardId}`);
      set({ currentBoard: res.data });
    } finally {
      set({ currentBoardLoading: false });
    }
  },

  createBoard: async (data) => {
    const res = await apiPost<BoardCreated>("/boards", data);
    // Add to boards list with _count fields
    const summary: BoardSummary = {
      ...res.data,
      _count: { members: 0, lists: res.data.lists?.length ?? 0 },
    };
    set((s) => ({ boards: [summary, ...s.boards] }));
    return res.data;
  },

  updateBoard: async (boardId, data) => {
    const res = await apiPut<BoardSummary>(`/boards/${boardId}`, data);
    set((s) => ({
      boards: s.boards.map((b) => (b.id === boardId ? { ...b, ...res.data } : b)),
      currentBoard: s.currentBoard?.id === boardId ? { ...s.currentBoard, ...data } : s.currentBoard,
    }));
  },

  deleteBoard: async (boardId) => {
    await apiDelete(`/boards/${boardId}`);
    set((s) => ({
      boards: s.boards.filter((b) => b.id !== boardId),
      currentBoard: s.currentBoard?.id === boardId ? null : s.currentBoard,
    }));
  },

  // ── Members ────────────────────────────────────────────────────────

  addMember: async (boardId, userId, role = "editor") => {
    const res = await apiPost<BoardMember>(`/boards/${boardId}/members`, { user_id: userId, role });
    set((s) => {
      if (s.currentBoard?.id !== boardId) return s;
      return { currentBoard: { ...s.currentBoard, members: [...s.currentBoard.members, res.data] } };
    });
    return res.data;
  },

  removeMember: async (boardId, userId) => {
    await apiDelete(`/boards/${boardId}/members/${userId}`);
    set((s) => {
      if (s.currentBoard?.id !== boardId) return s;
      return {
        currentBoard: {
          ...s.currentBoard,
          members: s.currentBoard.members.filter((m) => m.user_id !== userId),
        },
      };
    });
  },

  // ── Lists ──────────────────────────────────────────────────────────

  createList: async (boardId, name) => {
    const res = await apiPost<List>(`/boards/${boardId}/lists`, { name });
    set((s) => {
      if (s.currentBoard?.id !== boardId) return s;
      const newList: ListWithTasks = { ...res.data, tasks: [] };
      return { currentBoard: { ...s.currentBoard, lists: [...s.currentBoard.lists, newList] } };
    });
    return res.data;
  },

  updateList: async (boardId, listId, data) => {
    await apiPut(`/boards/${boardId}/lists/${listId}`, data);
    set((s) => {
      if (s.currentBoard?.id !== boardId) return s;
      return {
        currentBoard: {
          ...s.currentBoard,
          lists: s.currentBoard.lists.map((l) => (l.id === listId ? { ...l, ...data } : l)),
        },
      };
    });
  },

  deleteList: async (boardId, listId) => {
    await apiDelete(`/boards/${boardId}/lists/${listId}`);
    set((s) => {
      if (s.currentBoard?.id !== boardId) return s;
      return {
        currentBoard: {
          ...s.currentBoard,
          lists: s.currentBoard.lists.filter((l) => l.id !== listId),
        },
      };
    });
  },

  // ── Optimistic DnD ─────────────────────────────────────────────────

  optimisticMoveTask: (taskId, fromListId, toListId, newPosition) => {
    set((s) => {
      if (!s.currentBoard) return s;
      const lists = structuredClone(s.currentBoard.lists);

      const srcList = lists.find((l) => l.id === fromListId);
      const dstList = lists.find((l) => l.id === toListId);
      if (!srcList || !dstList) return s;

      const taskIdx = srcList.tasks.findIndex((t) => t.id === taskId);
      if (taskIdx === -1) return s;

      const [task] = srcList.tasks.splice(taskIdx, 1);
      task!.list_id = toListId;
      task!.position = newPosition;
      dstList.tasks.splice(newPosition, 0, task!);

      // Re-number positions
      srcList.tasks.forEach((t, i) => { t.position = i; });
      dstList.tasks.forEach((t, i) => { t.position = i; });

      return { currentBoard: { ...s.currentBoard, lists } };
    });
  },

  clearCurrentBoard: () => set({ currentBoard: null }),
}));
