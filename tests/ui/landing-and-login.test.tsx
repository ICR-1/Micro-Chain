// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtp = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOtp } }) }));
let searchError: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "error" ? searchError : null) }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import HomePage from "@/app/page";
import LoginForm from "@/app/login/LoginForm";
import LoginPage from "@/app/login/page";
import { formatDate, formatMoney, formatNumber, formatPercent, formatQuantity } from "@/lib/format";

beforeEach(() => {
  signInWithOtp.mockReset();
  searchError = null;
});
afterEach(cleanup);

describe("HomePage (landing Pasok-Siaga look)", () => {
  it("links the main CTA to the demo workspace and offers login", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /Coba Demo Dapur Sari/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /Buka ruang demo/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login");
  });

  it("renders the hero photo asset, the three steps and the footer tagline in Indonesian", () => {
    const { container } = render(<HomePage />);
    expect(screen.getByRole("img", { name: /Pembuat roti/ })).toHaveAttribute("src", "/dapur-sari.webp");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Saat pasokan\s*terganggu,\s*produksi tetap\s*terencana\./);
    for (const title of ["Petakan jaringan pasok", "Uji gangguan pasokan", "Bandingkan rencana produksi"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("Kenali Risiko. Simulasikan Dampak. Amankan Produksi.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/lorem ipsum|get started|sign in|learn more/i);
  });

  it("has a skip link and a labelled brand link", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Lewati ke isi" })).toHaveAttribute("href", "#isi");
    expect(screen.getAllByRole("link", { name: "MicroChain, beranda" }).length).toBeGreaterThan(0);
  });
});

describe("LoginPage and LoginForm", () => {
  it("wraps the form in the landing look with a demo escape hatch", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Masuk dengan email" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka demo tanpa masuk" })).toHaveAttribute("href", "/dashboard");
  });

  it("sends a magic link and confirms in Indonesian", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledTimes(1));
    expect(signInWithOtp.mock.calls[0][0].email).toBe("pemilik@dapur.id");
    expect(signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toMatch(/\/auth\/callback$/);
    expect(await screen.findByText(/Cek email Anda/i)).toBeInTheDocument();
  });

  it("shows a friendly error without leaking provider details", async () => {
    signInWithOtp.mockResolvedValue({ error: { message: "rate limit exceeded" } });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/gagal/i);
    expect(alert.textContent).not.toMatch(/rate limit/);
  });

  it("does not submit an empty or malformed email", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    expect(signInWithOtp).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Email"), "bukan-email");
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("explains a failed callback from the ?error query", () => {
    searchError = "kedaluwarsa";
    render(<LoginForm />);
    expect(screen.getByRole("alert").textContent).toMatch(/kedaluwarsa/i);
  });
});

describe("format helpers (id-ID)", () => {
  it("formats money, numbers, percentages, quantities and dates", () => {
    expect(formatMoney(342000)).toMatch(/^Rp\s342\.000$/);
    expect(formatMoney(null)).toBe("—");
    expect(formatNumber(25000)).toBe("25.000");
    expect(formatPercent(55)).toBe("55%");
    expect(formatPercent(null)).toBe("Tidak berlaku");
    expect(formatQuantity(8000, "g")).toBe("8 kg");
    expect(formatQuantity(250, "g")).toBe("250 g");
    expect(formatQuantity(12, "pcs")).toBe("12 buah");
    expect(formatDate("2026-11-24")).toBe("24 November 2026");
  });
});
