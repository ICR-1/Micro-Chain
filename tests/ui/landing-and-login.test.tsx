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

import HomePage from "@/app/page";
import LoginForm from "@/app/login/LoginForm";
import { formatRupiah, formatRupiahShort, formatNumber, formatPercent } from "@/lib/format";

beforeEach(() => {
  signInWithOtp.mockReset();
  searchError = null;
});
afterEach(cleanup);

describe("HomePage", () => {
  it("links the main CTA to /demo and a secondary link to /login", () => {
    render(<HomePage />);
    const cta = screen.getByRole("link", { name: "Coba Demo Dapur Sari" });
    expect(cta).toHaveAttribute("href", "/demo");
    expect(screen.getAllByRole("link", { name: /masuk/i }).some((a) => a.getAttribute("href") === "/login")).toBe(true);
  });

  it("shows the Dapur Sari headline numbers in Indonesian", () => {
    render(<HomePage />);
    expect(screen.getByText(/Rp 450 rb/)).toBeInTheDocument();
    expect(screen.getByText(/Rp 210 rb/)).toBeInTheDocument();
    expect(screen.getByText(/\+Rp 132 rb/)).toBeInTheDocument();
    expect(screen.getByText(/55%/)).toBeInTheDocument();
  });

  it("contains a single h1 and no English placeholder copy", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).not.toMatch(/lorem ipsum|get started|sign in|learn more|welcome to/i);
  });
});

describe("LoginForm", () => {
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

  it("shows a friendly error when sending fails", async () => {
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

describe("format helpers", () => {
  it("formats rupiah, numbers and percentages with id-ID separators", () => {
    expect(formatRupiah(342000)).toBe("Rp 342.000");
    expect(formatRupiah(-12000)).toBe("-Rp 12.000");
    expect(formatRupiahShort(450000)).toBe("Rp 450 rb");
    expect(formatRupiahShort(1_500_000)).toBe("Rp 1,5 jt");
    expect(formatNumber(25000)).toBe("25.000");
    expect(formatPercent(55)).toBe("55%");
    expect(formatPercent(53.3333)).toBe("53,3%");
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});
