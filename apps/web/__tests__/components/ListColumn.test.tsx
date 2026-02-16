import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListColumn from "@/components/Board/ListColumn";
import { useBoardStore } from "@/store/useBoardStore";
import { useToastStore } from "@/store/useToastStore";
import { createListWithTasks, createTask } from "../helpers/factories";

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
}));

vi.mock("@/store/useBoardStore", () => ({
  useBoardStore: vi.fn(),
}));

vi.mock("@/store/useToastStore", () => ({
  useToastStore: vi.fn(),
}));

vi.mock("@/store/useTaskStore", () => ({
  useTaskStore: vi.fn(() => ({ createTask: vi.fn() })),
}));

describe("ListColumn", () => {
  const mockUpdateList = vi.fn();
  const mockDeleteList = vi.fn();
  const mockAddToast = vi.fn();
  const onTaskClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBoardStore).mockReturnValue({
      updateList: mockUpdateList,
      deleteList: mockDeleteList,
    } as any);
    vi.mocked(useToastStore).mockReturnValue({ addToast: mockAddToast } as any);

    // Mock window.confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("should render list name", () => {
    const list = createListWithTasks({ name: "To Do" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("should render task count badge", () => {
    const list = createListWithTasks({
      name: "In Progress",
      tasks: [createTask({ id: "t1" }), createTask({ id: "t2" })],
    });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should render tasks", () => {
    const list = createListWithTasks({
      tasks: [
        createTask({ id: "t1", title: "First task" }),
        createTask({ id: "t2", title: "Second task" }),
      ],
    });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);
    expect(screen.getByText("First task")).toBeInTheDocument();
    expect(screen.getByText("Second task")).toBeInTheDocument();
  });

  it("should call onTaskClick when a task is clicked", async () => {
    const list = createListWithTasks({
      tasks: [createTask({ id: "task-42", title: "Click me" })],
    });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);
    await userEvent.click(screen.getByText("Click me"));
    expect(onTaskClick).toHaveBeenCalledWith("task-42");
  });

  it("should show dropdown menu when menu button is clicked", async () => {
    const list = createListWithTasks({ name: "Test List" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    // Click the more button (MoreHorizontal icon)
    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);

    expect(screen.getByText("Rename")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("should show inline rename input when Rename is clicked", async () => {
    const list = createListWithTasks({ name: "Test List" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Rename"));

    expect(screen.getByDisplayValue("Test List")).toBeInTheDocument();
  });

  it("should call updateList when rename is confirmed", async () => {
    mockUpdateList.mockResolvedValue({});
    const list = createListWithTasks({ name: "Old Name" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    // Open menu and click rename
    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Rename"));

    // Clear and type new name
    const input = screen.getByDisplayValue("Old Name");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdateList).toHaveBeenCalledWith("b1", list.id, { name: "New Name" });
    });
  });

  it("should revert name if same name or empty on blur", async () => {
    const list = createListWithTasks({ name: "Same Name" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Rename"));

    const input = screen.getByDisplayValue("Same Name");
    fireEvent.blur(input);

    expect(mockUpdateList).not.toHaveBeenCalled();
  });

  it("should call deleteList when Delete is clicked", async () => {
    mockDeleteList.mockResolvedValue({});
    const list = createListWithTasks({ name: "To Delete" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteList).toHaveBeenCalledWith("b1", list.id);
    });
  });

  it("should show success toast after deleting", async () => {
    mockDeleteList.mockResolvedValue({});
    const list = createListWithTasks({ name: "To Delete" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("List deleted", "success");
    });
  });

  it("should show error toast on delete failure", async () => {
    mockDeleteList.mockRejectedValue(new Error("fail"));
    const list = createListWithTasks({ name: "To Delete" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("Failed to delete list", "error");
    });
  });

  it("should render the CreateTaskForm", () => {
    const list = createListWithTasks();
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);
    expect(screen.getByText("Add task")).toBeInTheDocument();
  });

  it("should cancel rename on Escape key", async () => {
    const list = createListWithTasks({ name: "Original" });
    render(<ListColumn list={list} boardId="b1" onTaskClick={onTaskClick} />);

    const moreButtons = screen.getAllByRole("button");
    const menuButton = moreButtons.find((btn) => !btn.textContent?.includes("Add task"));
    await userEvent.click(menuButton!);
    await userEvent.click(screen.getByText("Rename"));

    const input = screen.getByDisplayValue("Original");
    await userEvent.clear(input);
    await userEvent.type(input, "Changed");
    fireEvent.keyDown(input, { key: "Escape" });

    // Should back to showing the name, not the input
    expect(screen.getByText("Original")).toBeInTheDocument();
  });
});
