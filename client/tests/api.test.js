import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiError } from "../src/api.js";

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("başarılı yanıtta JSON gövdesini döner", async () => {
    mockFetch({ ok: true, status: 200, json: async () => [{ id: 1 }] });
    expect(await apiFetch("/api/subjects")).toEqual([{ id: 1 }]);
  });

  it("204 yanıtında null döner", async () => {
    mockFetch({ ok: true, status: 204 });
    expect(await apiFetch("/api/topics/1", { method: "DELETE" })).toBeNull();
  });

  it("sunucu { error } dönerse ApiError fırlatır, mesaj sunucudan gelir", async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: async () => ({ error: "Ders zorunlu" }),
    });
    const error = await apiFetch("/api/sessions", {
      method: "POST",
      body: {},
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Ders zorunlu");
  });

  it("yanıt JSON değilse genel mesajla ApiError fırlatır", async () => {
    mockFetch({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("json değil");
      },
    });
    await expect(apiFetch("/api/x")).rejects.toThrow("Bir şeyler ters gitti");
  });

  it("ağ hatasında 'Sunucuya ulaşılamıyor' mesajı verir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(apiFetch("/api/subjects")).rejects.toThrow(
      "Sunucuya ulaşılamıyor",
    );
  });

  it("body'yi JSON olarak ve doğru başlıkla gönderir", async () => {
    const fn = mockFetch({
      ok: true,
      status: 201,
      json: async () => ({ id: 1 }),
    });
    await apiFetch("/api/topics", { method: "POST", body: { name: "x" } });
    const [url, options] = fn.mock.calls[0];
    expect(url).toBe("/api/topics");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ name: "x" }));
  });
});
