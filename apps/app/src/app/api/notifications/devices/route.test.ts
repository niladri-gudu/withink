import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpoPushTokenRepository } from "@/features/notifications/repositories/expo-push-token-repository";

import type * as apiLib from "../../_lib";
import { requireApiSession } from "../../_lib";
import { DELETE, POST } from "./route";

vi.mock("../../_lib", async (importOriginal) => {
  const actual = await importOriginal<typeof apiLib>();
  return { ...actual, requireApiSession: vi.fn() };
});

vi.mock(
  "@/features/notifications/repositories/expo-push-token-repository",
  () => ({
    ExpoPushTokenRepository: {
      upsert: vi.fn(),
      deleteByToken: vi.fn(),
    },
  }),
);

const TOKEN = "ExpoPushToken[device-abc]";

function request(method: string, body: unknown): Request {
  return new Request("http://localhost/api/notifications/devices", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/notifications/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireApiSession).mockResolvedValue({
      userId: "user-1",
    } as never);
  });

  it("rejects an unauthenticated request", async () => {
    vi.mocked(requireApiSession).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as never);
    const res = await POST(
      request("POST", { token: TOKEN, platform: "android" }) as never,
    );
    expect(res.status).toBe(401);
    expect(ExpoPushTokenRepository.upsert).not.toHaveBeenCalled();
  });

  it("rejects a non-Expo token", async () => {
    const res = await POST(
      request("POST", {
        token: "https://example.com/push",
        platform: "android",
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_REQUEST" });
    expect(ExpoPushTokenRepository.upsert).not.toHaveBeenCalled();
  });

  it("registers the device for the session user", async () => {
    const res = await POST(
      request("POST", {
        token: TOKEN,
        platform: "android",
        deviceLabel: "Pixel",
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(ExpoPushTokenRepository.upsert).toHaveBeenCalledWith("user-1", {
      token: TOKEN,
      platform: "android",
      deviceLabel: "Pixel",
    });
  });

  it("unregisters by token", async () => {
    const res = await DELETE(request("DELETE", { token: TOKEN }) as never);
    expect(res.status).toBe(200);
    expect(ExpoPushTokenRepository.deleteByToken).toHaveBeenCalledWith(
      "user-1",
      TOKEN,
    );
  });
});
