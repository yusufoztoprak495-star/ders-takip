import { describe, it, expect, vi } from "vitest";
import {
  persistenceLabel,
  requestPersistence,
} from "../src/lib/persistence.js";

describe("requestPersistence", () => {
  it("zaten kalıcıysa tekrar istemez", async () => {
    const storage = { persisted: async () => true, persist: vi.fn() };
    expect(await requestPersistence(storage)).toBe("granted");
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("tarayıcı izin verirse granted döner", async () => {
    const storage = { persisted: async () => false, persist: async () => true };
    expect(await requestPersistence(storage)).toBe("granted");
  });

  it("tarayıcı izin vermezse denied döner", async () => {
    const storage = {
      persisted: async () => false,
      persist: async () => false,
    };
    expect(await requestPersistence(storage)).toBe("denied");
  });

  it("storage ya da persist yoksa unsupported döner", async () => {
    expect(await requestPersistence(undefined)).toBe("unsupported");
    expect(await requestPersistence({})).toBe("unsupported");
  });

  it("persist hata fırlatırsa çökmez, denied döner", async () => {
    const storage = {
      persisted: async () => false,
      persist: async () => {
        throw new Error("izin hatası");
      },
    };
    expect(await requestPersistence(storage)).toBe("denied");
  });
});

describe("persistenceLabel", () => {
  it("her durum için Türkçe yazı verir", () => {
    expect(persistenceLabel("granted")).toBe("Kalıcı: Evet");
    expect(persistenceLabel("denied")).toBe(
      "Kalıcı: Hayır (tarayıcı izin vermedi)",
    );
    expect(persistenceLabel("unsupported")).toBe("Bu tarayıcı desteklemiyor");
    expect(persistenceLabel("checking")).toBe("Denetleniyor…");
  });
});
