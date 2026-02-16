"use client";

import { useEffect } from "react";
import { useSocketStore } from "@/store/useSocketStore";
import { useBoardStore } from "@/store/useBoardStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task, ListWithTasks, BoardDetail, BoardMember } from "@/types";

/**
 * Subscribe to real-time events for a specific board.
 * Call this inside the board page — it joins/leaves the board room
 * and patches Zustand state when events arrive from other clients.
 */
export function useBoardSocket(boardId: string) {
  const socket = useSocketStore((s) => s.socket);
  const connected = useSocketStore((s) => s.connected);
  const joinBoard = useSocketStore((s) => s.joinBoard);
  const leaveBoard = useSocketStore((s) => s.leaveBoard);

  useEffect(() => {
    if (!socket || !connected) return;

    joinBoard(boardId);

    // ── Task events ────────────────────────────────────────────────

    const onTaskCreated = (data: { boardId: string; task: Task }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;

      const lists = board.lists.map((l) => {
        if (l.id === data.task.list_id) {
          // Avoid duplicates (the author already has it via optimistic update)
          if (l.tasks.some((t) => t.id === data.task.id)) return l;
          return { ...l, tasks: [...l.tasks, { ...data.task, assignees: data.task.assignees ?? [] }] };
        }
        return l;
      });
      useBoardStore.setState({ currentBoard: { ...board, lists } });
    };

    const onTaskUpdated = (data: { boardId: string; task: Task }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;

      const lists = board.lists.map((l) => ({
        ...l,
        tasks: l.tasks.map((t) => (t.id === data.task.id ? { ...t, ...data.task } : t)),
      }));
      useBoardStore.setState({ currentBoard: { ...board, lists } });

      // Also update selected task if open
      const selected = useTaskStore.getState().selectedTask;
      if (selected?.id === data.task.id) {
        useTaskStore.setState({ selectedTask: { ...selected, ...data.task } });
      }
    };

    const onTaskDeleted = (data: { boardId: string; taskId: string }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;

      const lists = board.lists.map((l) => ({
        ...l,
        tasks: l.tasks.filter((t) => t.id !== data.taskId),
      }));
      useBoardStore.setState({ currentBoard: { ...board, lists } });

      if (useTaskStore.getState().selectedTask?.id === data.taskId) {
        useTaskStore.setState({ selectedTask: null });
      }
    };

    const onTaskMoved = (data: { boardId: string; task: Task }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;

      // Remove task from all lists, then insert into the correct one
      const task = data.task;
      let lists = board.lists.map((l) => ({
        ...l,
        tasks: l.tasks.filter((t) => t.id !== task.id),
      }));
      lists = lists.map((l) => {
        if (l.id === task.list_id) {
          const tasks = [...l.tasks];
          tasks.splice(task.position, 0, { ...task, assignees: task.assignees ?? [] });
          // Re-index positions
          return { ...l, tasks: tasks.map((t, i) => ({ ...t, position: i })) };
        }
        return l;
      });
      useBoardStore.setState({ currentBoard: { ...board, lists } });
    };

    // ── List events ────────────────────────────────────────────────

    const onListCreated = (data: { boardId: string; list: ListWithTasks }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      if (board.lists.some((l) => l.id === data.list.id)) return; // avoid dup
      const newList: ListWithTasks = { ...data.list, tasks: data.list.tasks ?? [] };
      useBoardStore.setState({ currentBoard: { ...board, lists: [...board.lists, newList] } });
    };

    const onListUpdated = (data: { boardId: string; list: ListWithTasks }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      const lists = board.lists.map((l) => (l.id === data.list.id ? { ...l, ...data.list } : l));
      useBoardStore.setState({ currentBoard: { ...board, lists } });
    };

    const onListDeleted = (data: { boardId: string; listId: string }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      const lists = board.lists.filter((l) => l.id !== data.listId);
      useBoardStore.setState({ currentBoard: { ...board, lists } });
    };

    // ── Board events ───────────────────────────────────────────────

    const onBoardUpdated = (data: { boardId: string; board: Partial<BoardDetail> }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      useBoardStore.setState({ currentBoard: { ...board, ...data.board } });
    };

    const onMemberAdded = (data: { boardId: string; member: BoardMember }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      if (board.members.some((m) => m.id === data.member.id)) return;
      useBoardStore.setState({ currentBoard: { ...board, members: [...board.members, data.member] } });
    };

    const onMemberRemoved = (data: { boardId: string; userId: string }) => {
      const board = useBoardStore.getState().currentBoard;
      if (!board || board.id !== data.boardId) return;
      useBoardStore.setState({
        currentBoard: {
          ...board,
          members: board.members.filter((m) => m.user_id !== data.userId),
        },
      });
    };

    // ── Register listeners ─────────────────────────────────────────

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("task:moved", onTaskMoved);
    socket.on("list:created", onListCreated);
    socket.on("list:updated", onListUpdated);
    socket.on("list:deleted", onListDeleted);
    socket.on("board:updated", onBoardUpdated);
    socket.on("member:added", onMemberAdded);
    socket.on("member:removed", onMemberRemoved);

    return () => {
      leaveBoard(boardId);
      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("task:moved", onTaskMoved);
      socket.off("list:created", onListCreated);
      socket.off("list:updated", onListUpdated);
      socket.off("list:deleted", onListDeleted);
      socket.off("board:updated", onBoardUpdated);
      socket.off("member:added", onMemberAdded);
      socket.off("member:removed", onMemberRemoved);
    };
  }, [socket, connected, boardId, joinBoard, leaveBoard]);
}
