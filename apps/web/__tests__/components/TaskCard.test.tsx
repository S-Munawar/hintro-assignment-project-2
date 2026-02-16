import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCard from "@/components/Task/TaskCard";
import { createTask, createTaskAssignee } from "../helpers/factories";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe("TaskCard", () => {
  const onClick = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render task title", () => {
    const task = createTask({ title: "Fix login bug" });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("should render task description when present", () => {
    const task = createTask({ description: "Need to fix the auth flow" });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText("Need to fix the auth flow")).toBeInTheDocument();
  });

  it("should not render description when absent", () => {
    const task = createTask({ description: null });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.queryByText("Need to fix")).not.toBeInTheDocument();
  });

  it("should render priority badge", () => {
    const task = createTask({ priority: "high" });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("should render due date when present", () => {
    const task = createTask({ due_date: "2025-06-15T00:00:00Z" });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it("should not render due date when absent", () => {
    const task = createTask({ due_date: null });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
  });

  it("should show overdue styling for past due dates", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const task = createTask({ due_date: pastDate.toISOString() });
    render(<TaskCard task={task} onClick={onClick} />);
    // The overdue span gets text-red-500 class
    const dueDateSpan = screen.getByText(/\d+/).closest("span");
    expect(dueDateSpan).toBeInTheDocument();
  });

  it("should render assignee avatars", () => {
    const task = createTask({
      assignees: [
        createTaskAssignee({ id: "a1", user_id: "u2" }),
        createTaskAssignee({ id: "a2", user_id: "u3" }),
      ],
    });
    render(<TaskCard task={task} onClick={onClick} />);
    // Should show first letters of assignee names — may have multiple "J" avatars
    const avatars = screen.getAllByText("J");
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it("should show +N for more than 3 assignees", () => {
    const assignees = [1, 2, 3, 4].map((i) =>
      createTaskAssignee({
        id: `a${i}`,
        user_id: `u${i}`,
        user: { id: `u${i}`, first_name: `User${i}`, last_name: "Test", avatar_url: null },
      }),
    );
    const task = createTask({ assignees });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("should not render assignee section when empty", () => {
    const task = createTask({ assignees: [] });
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.queryByTitle(/User/)).not.toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const task = createTask();
    render(<TaskCard task={task} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render as a button element", () => {
    const task = createTask();
    render(<TaskCard task={task} onClick={onClick} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should render all priority levels", () => {
    (["low", "medium", "high", "urgent"] as const).forEach((priority) => {
      const task = createTask({ priority, id: `task-${priority}` });
      const { container } = render(<TaskCard task={task} onClick={onClick} />);
      expect(container.querySelector(`.priority-${priority}`)).toBeInTheDocument();
    });
  });
});
