"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthenticatedLayout from "@/components/Auth/AuthenticatedLayout";
import BoardHeader from "@/components/Board/BoardHeader";
import ListColumn from "@/components/Board/ListColumn";
import CreateListForm from "@/components/Board/CreateListForm";
import TaskDetailModal from "@/components/Task/TaskDetailModal";
import TaskCard from "@/components/Task/TaskCard";
import Loader from "@/components/Common/Loader";
import { useBoardStore } from "@/store/useBoardStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useToastStore } from "@/store/useToastStore";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import type { Task } from "@/types";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const router = useRouter();
  const { currentBoard, currentBoardLoading, fetchBoard, clearCurrentBoard, optimisticMoveTask } = useBoardStore();
  const { moveTask, clearSelectedTask, fetchTaskDetail } = useTaskStore();
  const { addToast } = useToastStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Track the original position so we can persist only the final move
  const dragOriginRef = useRef<{ listId: string; position: number } | null>(null);

  // ── Real-time sync ─────────────────────────────────────────────────
  useBoardSocket(boardId);

  useEffect(() => {
    fetchBoard(boardId).catch(() => {
      addToast("Board not found", "error");
      router.push("/");
    });
    return () => clearCurrentBoard();
  }, [boardId, fetchBoard, clearCurrentBoard, addToast, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Helpers ────────────────────────────────────────────────────────

  /** Find which list currently contains a given task id */
  const findListContainingTask = useCallback(
    (taskId: string) => {
      if (!currentBoard) return null;
      return currentBoard.lists.find((l) => l.tasks.some((t) => t.id === taskId)) ?? null;
    },
    [currentBoard],
  );

  /** Determine if an id belongs to a list (droppable) or a task (sortable) */
  const resolveDropTarget = useCallback(
    (overId: string) => {
      if (!currentBoard) return null;
      // Check if it's a list id first
      const list = currentBoard.lists.find((l) => l.id === overId);
      if (list) return { listId: list.id, index: list.tasks.length };
      // Otherwise, find the list containing this task
      for (const l of currentBoard.lists) {
        const idx = l.tasks.findIndex((t) => t.id === overId);
        if (idx !== -1) return { listId: l.id, index: idx };
      }
      return null;
    },
    [currentBoard],
  );

  // ── Drag handlers ─────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskId = event.active.id as string;
      if (!currentBoard) return;
      for (const list of currentBoard.lists) {
        const task = list.tasks.find((t) => t.id === taskId);
        if (task) {
          setActiveTask(task);
          dragOriginRef.current = { listId: list.id, position: list.tasks.findIndex((t) => t.id === taskId) };
          break;
        }
      }
    },
    [currentBoard],
  );

  /** Fires while hovering — handle cross-list movement optimistically */
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !currentBoard) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeList = findListContainingTask(activeId);
      const target = resolveDropTarget(overId);
      if (!activeList || !target) return;

      // Only handle cross-container moves here
      if (activeList.id === target.listId) return;

      optimisticMoveTask(activeId, activeList.id, target.listId, target.index);
    },
    [currentBoard, findListContainingTask, resolveDropTarget, optimisticMoveTask],
  );

  /** Fires on drop — persist the final position to the API */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const origin = dragOriginRef.current;
      setActiveTask(null);
      dragOriginRef.current = null;

      const { active, over } = event;
      if (!over || !currentBoard || !origin) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Determine where the task is NOW (after any onDragOver moves)
      const currentList = findListContainingTask(taskId);
      if (!currentList) return;

      const target = resolveDropTarget(overId);
      if (!target) return;

      // If staying in the same list, apply the intra-list reorder optimistically
      if (currentList.id === target.listId) {
        const currentIdx = currentList.tasks.findIndex((t) => t.id === taskId);
        if (currentIdx === target.index) {
          // Hasn't moved from original? No-op
          if (origin.listId === currentList.id && origin.position === currentIdx) return;
        }
        // Optimistic reorder within same list
        if (currentIdx !== target.index) {
          optimisticMoveTask(taskId, currentList.id, target.listId, target.index);
        }
      }

      // Determine final destination
      const finalList = findListContainingTask(taskId);
      if (!finalList) return;
      const finalPosition = finalList.tasks.findIndex((t) => t.id === taskId);

      // If nothing changed from origin, skip API call
      if (origin.listId === finalList.id && origin.position === finalPosition) return;

      try {
        await moveTask(boardId, taskId, { list_id: finalList.id, position: finalPosition });
      } catch {
        addToast("Failed to move task", "error");
        fetchBoard(boardId);
      }
    },
    [currentBoard, boardId, optimisticMoveTask, moveTask, fetchBoard, addToast, findListContainingTask, resolveDropTarget],
  );

  const handleTaskClick = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      fetchTaskDetail(boardId, taskId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedTaskId(null);
    clearSelectedTask();
  }, [clearSelectedTask]);

  if (currentBoardLoading || !currentBoard) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-full">
          <Loader size="lg" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col h-full">
        <BoardHeader board={currentBoard} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-5">
            <div className="flex gap-4 h-full items-start">
              {currentBoard.lists.map((list) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  boardId={boardId}
                  onTaskClick={handleTaskClick}
                />
              ))}
              <CreateListForm boardId={boardId} />
            </div>
          </div>

          {/* Drag overlay — floating card that follows the cursor */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeTask ? (
              <TaskCard task={activeTask} onClick={() => {}} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {selectedTaskId && (
          <TaskDetailModal
            boardId={boardId}
            taskId={selectedTaskId}
            isOpen={!!selectedTaskId}
            onClose={handleCloseDetail}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
