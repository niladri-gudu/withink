import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOptionalNativeModule = vi.hoisted(() => vi.fn());

vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule }));

const SELF_TEST_PASSWORD = "withink-kdf-self-test";
const SELF_TEST_SALT = "00112233445566778899aabbccddeeff";
const SELF_TEST_RESULT =
  "4917bc0f29b8c8c2fae237fd4e17c7e2e188f5bc30ae92a6f055b00a4f664420";

async function loadWrapper() {
  vi.resetModules();
  return await import("../../modules/withink-crypto/src");
}

function nativeModuleWith(impl: (password: string) => Promise<string>) {
  return { pbkdf2Sha256: vi.fn(impl) };
}

describe("native PBKDF2 wrapper", () => {
  beforeEach(() => {
    requireOptionalNativeModule.mockReset();
  });

  it("falls back when the module is missing (Expo Go)", async () => {
    requireOptionalNativeModule.mockReturnValue(null);
    const wrapper = await loadWrapper();

    expect(wrapper.hasNativePbkdf2Module()).toBe(false);
    await expect(
      wrapper.deriveKeyHexNatively("password", SELF_TEST_SALT, 3),
    ).resolves.toBeNull();
  });

  it("derives with the native module when the self-test passes", async () => {
    const expected = "ab".repeat(32);
    const native = nativeModuleWith(async (password) =>
      password === SELF_TEST_PASSWORD ? SELF_TEST_RESULT : expected,
    );
    requireOptionalNativeModule.mockReturnValue(native);
    const wrapper = await loadWrapper();

    await expect(
      wrapper.deriveKeyHexNatively("password", SELF_TEST_SALT, 3),
    ).resolves.toBe(expected);
    expect(native.pbkdf2Sha256).toHaveBeenLastCalledWith(
      "password",
      SELF_TEST_SALT,
      3,
    );
  });

  it("runs the self-test once per module instance", async () => {
    const native = nativeModuleWith(async (password) =>
      password === SELF_TEST_PASSWORD ? SELF_TEST_RESULT : "cd".repeat(32),
    );
    requireOptionalNativeModule.mockReturnValue(native);
    const wrapper = await loadWrapper();

    await wrapper.deriveKeyHexNatively("one", SELF_TEST_SALT, 3);
    await wrapper.deriveKeyHexNatively("two", SELF_TEST_SALT, 3);

    expect(native.pbkdf2Sha256).toHaveBeenCalledTimes(3);
    expect(native.pbkdf2Sha256).toHaveBeenNthCalledWith(
      1,
      SELF_TEST_PASSWORD,
      SELF_TEST_SALT,
      2,
    );
  });

  it("refuses a module that fails the known-answer test", async () => {
    const native = nativeModuleWith(async () => "ff".repeat(32));
    requireOptionalNativeModule.mockReturnValue(native);
    const wrapper = await loadWrapper();

    await expect(
      wrapper.deriveKeyHexNatively("password", SELF_TEST_SALT, 3),
    ).resolves.toBeNull();
    expect(native.pbkdf2Sha256).toHaveBeenCalledTimes(1);
  });

  it("refuses a module that throws during the self-test", async () => {
    const native = nativeModuleWith(async () => {
      throw new Error("bridge exploded");
    });
    requireOptionalNativeModule.mockReturnValue(native);
    const wrapper = await loadWrapper();

    await expect(
      wrapper.deriveKeyHexNatively("password", SELF_TEST_SALT, 3),
    ).resolves.toBeNull();
  });

  it("returns the exact key for a known vector through the module", async () => {
    const native = nativeModuleWith(async (password) =>
      password === SELF_TEST_PASSWORD
        ? SELF_TEST_RESULT
        : "dfb233c3b5065575ef404328c881a0cba71b7180f72298a2edc5ea5f3a4c02f9",
    );
    requireOptionalNativeModule.mockReturnValue(native);
    const wrapper = await loadWrapper();

    await expect(
      wrapper.deriveKeyHexNatively(
        "correct horse battery staple",
        SELF_TEST_SALT,
        1000,
      ),
    ).resolves.toBe(
      "dfb233c3b5065575ef404328c881a0cba71b7180f72298a2edc5ea5f3a4c02f9",
    );
  });
});
