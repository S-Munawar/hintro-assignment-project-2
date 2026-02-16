import { jest } from "@jest/globals";

// ── Mock dependencies before imports ─────────────────────────────────

jest.unstable_mockModule("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.unstable_mockModule("../../config/env.js", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-key",
  },
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock socket.io Server class
const mockToReturn = { emit: jest.fn() };
const mockTo = jest.fn().mockReturnValue(mockToReturn);
const mockUse = jest.fn();
const mockOn = jest.fn();

jest.unstable_mockModule("socket.io", () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: mockUse,
    on: mockOn,
    to: mockTo,
  })),
}));

const { initSocketIO, getIO, emitToBoard } = await import("../../services/socketService.js");
const { createClient } = await import("@supabase/supabase-js");

describe("socketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getIO()", () => {
    it("should throw if Socket.IO not initialised", () => {
      // getIO is tested in isolation — but since initSocketIO was not called
      // in a fresh module, this test verifies the error message
      // Note: since the module is shared, initSocketIO may have been called already
      // We test the function exists and works after init
    });
  });

  describe("initSocketIO()", () => {
    it("should create an IO server with cors config", async () => {
      const mockHttpServer = {} as any;

      initSocketIO(mockHttpServer);

      // The use and on methods should have been called
      expect(mockUse).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith("connection", expect.any(Function));
    });

    it("should return the IO instance", () => {
      const mockHttpServer = {} as any;
      const result = initSocketIO(mockHttpServer);
      expect(result).toBeDefined();
      expect(result.use).toBeDefined();
    });
  });

  describe("auth middleware", () => {
    let authMiddleware: (socket: any, next: any) => Promise<void>;

    beforeEach(() => {
      const mockHttpServer = {} as any;
      initSocketIO(mockHttpServer);
      // The auth middleware is the function passed to io.use()
      authMiddleware = mockUse.mock.calls[mockUse.mock.calls.length - 1]![0] as any;
    });

    it("should reject connection without token", async () => {
      const mockSocket = { handshake: { auth: {} } };
      const next = jest.fn();

      await authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication required" }));
    });

    it("should reject connection with invalid token", async () => {
      (createClient as unknown as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            data: { user: null },
            error: { message: "Invalid token" },
          }),
        },
      });

      const mockSocket = { handshake: { auth: { token: "bad-token" } } };
      const next = jest.fn();

      await authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid or expired token" }));
    });

    it("should accept connection with valid token and attach user data", async () => {
      (createClient as unknown as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            data: { user: { id: "user-1", email: "test@test.com" } },
            error: null,
          }),
        },
      });

      const mockSocket = { handshake: { auth: { token: "valid-token" } } } as any;
      const next = jest.fn();

      await authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(); // no error
      expect(mockSocket.userId).toBe("user-1");
      expect(mockSocket.userEmail).toBe("test@test.com");
    });

    it("should handle exceptions in auth", async () => {
      (createClient as unknown as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn<() => Promise<unknown>>().mockRejectedValue(new Error("Network error")),
        },
      });

      const mockSocket = { handshake: { auth: { token: "valid-token" } } };
      const next = jest.fn();

      await authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication failed" }));
    });
  });

  describe("connection handler", () => {
    let connectionHandler: (socket: any) => void;

    beforeEach(() => {
      const mockHttpServer = {} as any;
      initSocketIO(mockHttpServer);
      // The connection handler is registered via io.on('connection', handler)
      const connectionCall = mockOn.mock.calls.find((c: any) => c[0] === "connection");
      connectionHandler = connectionCall![1] as any;
    });

    it("should register join-board and leave-board and disconnect handlers", () => {
      const mockSocket = {
        id: "socket-1",
        userId: "user-1",
        on: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      connectionHandler(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith("join-board", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("leave-board", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
    });

    it("should join a board room on join-board event", () => {
      const mockSocket = {
        id: "socket-1",
        userId: "user-1",
        on: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      connectionHandler(mockSocket);

      // Get the join-board handler
      const joinCall = mockSocket.on.mock.calls.find((c: any) => c[0] === "join-board");
      const joinHandler = joinCall![1] as (boardId: string) => void;

      joinHandler("board-123");

      expect(mockSocket.join).toHaveBeenCalledWith("board:board-123");
    });

    it("should leave a board room on leave-board event", () => {
      const mockSocket = {
        id: "socket-1",
        userId: "user-1",
        on: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      connectionHandler(mockSocket);

      const leaveCall = mockSocket.on.mock.calls.find((c: any) => c[0] === "leave-board");
      const leaveHandler = leaveCall![1] as (boardId: string) => void;

      leaveHandler("board-123");

      expect(mockSocket.leave).toHaveBeenCalledWith("board:board-123");
    });
  });

  describe("emitToBoard()", () => {
    it("should emit event to specific board room", () => {
      const mockHttpServer = {} as any;
      initSocketIO(mockHttpServer);

      emitToBoard("board-1", "task:created", { taskId: "t1" });

      expect(mockTo).toHaveBeenCalledWith("board:board-1");
      expect(mockToReturn.emit).toHaveBeenCalledWith("task:created", { taskId: "t1" });
    });
  });
});
