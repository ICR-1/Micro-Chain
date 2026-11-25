// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtp = vi.fn();
const signInWithPassword = vi.fn();
const signUp = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOtp, signInWithPassword, signUp } }) }));
let searchError: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
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
  signInWithPassword.mockReset();
  signUp.mockReset();
  replace.mockReset();
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

  it("defaults to password login and goes to the workspace on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /Kata sandi/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: "pemilik@dapur.id", password: "rahasia123" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
  });

  it("shows Indonesian errors for wrong credentials and rate limits without leaking provider text", async () => {
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "salah");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Email atau kata sandi salah.");
    expect(replace).not.toHaveBeenCalled();

    signInWithPassword.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" } });
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Batas pengiriman email/));
    expect(screen.getByRole("alert").textContent).not.toMatch(/exceeded/);
  });

  it("validates the email and password before calling Supabase", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert").textContent).toMatch(/email yang valid/);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Masukkan kata sandi/);
    await userEvent.type(screen.getByLabelText("Kata sandi"), "pendek");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    expect(screen.getByRole("alert").textContent).toMatch(/minimal 8 karakter/);
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up: goes straight in when no confirmation is required, otherwise asks to check email", async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    const { unmount } = render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "baru@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toMatch(/\/auth\/callback$/);
    unmount();

    signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "baru@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    expect(await screen.findByText(/Cek email Anda/)).toBeInTheDocument();
  });

  it("sends a magic link from the email-link tab and confirms in Indonesian", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /Tautan email/ }));
    expect(screen.queryByLabelText("Kata sandi")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledTimes(1));
    expect(signInWithOtp.mock.calls[0][0].email).toBe("pemilik@dapur.id");
    expect(await screen.findByText(/Cek email Anda/i)).toBeInTheDocument();
  });

  it("shows a friendly rate-limit message for the magic link", async () => {
    signInWithOtp.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429, message: "rate limit exceeded" } });
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /Tautan email/ }));
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Kirim Tautan Masuk" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/masuk dengan kata sandi/);
    expect(alert.textContent).not.toMatch(/rate limit exceeded/);
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
