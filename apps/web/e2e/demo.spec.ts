import { expect, test, type Page } from "@playwright/test";

function rupiah(value: string) {
  return new RegExp(`Rp\\s*${value.replace(".", "\\.")}`);
}

async function openSection(page: Page, name: string) {
  const link = page.getByRole("navigation", { name: "Navigasi ruang kerja" }).getByRole("link", { name });
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

test("demo menghubungkan jaringan, optimasi, perbandingan, dan perubahan stok", async ({ page, isMobile }) => {
  const fatalErrors: string[] = [];
  page.on("pageerror", (error) => fatalErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Coba Demo Dapur Sari" }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole("main").getByText(/tepung terigu/i).first()).toBeVisible();

  await openSection(page, "Jaringan Pasok");
  await expect(page).toHaveURL(/\/network\/?$/);
  if (isMobile) {
    await expect(page.getByRole("button", { name: "Daftar", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /pemasok a\b/i }).click();
  } else {
    await page.getByRole("group", { name: "Pemasok A, pemasok", exact: true }).click();
  }
  const details = page.getByRole("region", { name: "Detail hubungan" });
  await expect(details.getByRole("heading", { name: "Pemasok A" })).toBeVisible();
  if (!isMobile) {
    await page.getByRole("group", { name: "Pemasok B, pemasok", exact: true }).press("Enter");
    await expect(details.getByRole("heading", { name: "Pemasok B" })).toBeVisible();
  }

  await openSection(page, "Simulator");
  async function runScenario(label: RegExp, units: number, netIdr: number) {
    await page.getByText(label, { exact: true }).first().click();
    const reply = page.waitForResponse((response) => response.url().endsWith("/api/v1/simulations/preview") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Jalankan Simulasi" }).click();
    const response = await reply;
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toMatchObject({
      solver_status: "OPTIMAL",
      production: expect.arrayContaining([expect.objectContaining({ product_id: "bread", units })]),
      kpis: { net_contribution_idr: netIdr },
    });
    const formatted = new Intl.NumberFormat("id-ID").format(netIdr);
    await expect(page.getByRole("main").getByText(rupiah(formatted)).first()).toBeVisible();
    await expect(page.getByRole("row", { name: /^Roti\b/ }).getByText(new RegExp(`^${units}(?:\\D|$)`)).first()).toBeVisible();
  }

  await runScenario(/^Normal$/, 100, 450_000);
  await runScenario(/^Pemasok Utama Gagal$/, 20, 210_000);
  await runScenario(/^Mitigasi: Pemasok Alternatif Aktif$/, 68, 342_000);

  await openSection(page, "Perbandingan");
  await expect(page.getByRole("main").getByText(rupiah("132.000")).first()).toBeVisible();
  await expect(page.getByRole("main").getByText(/55(?:,0)?\s*%/).first()).toBeVisible();

  await openSection(page, "Data Usaha");
  await page.getByRole("spinbutton", { name: /tepung terigu/i }).fill("9000");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await openSection(page, "Simulator");
  await expect(page.getByText(/perubahan belum disimulasikan/i)).toBeVisible();
  await runScenario(/^Mitigasi: Pemasok Alternatif Aktif$/, 72, 354_000);

  await openSection(page, "Data Usaha");
  await page.getByRole("button", { name: "Reset Demo" }).click();
  await expect(page.getByRole("spinbutton", { name: /tepung terigu/i })).toHaveValue("8000");
  expect(fatalErrors).toEqual([]);
});

test("simulator menampilkan loading dan dapat pulih setelah koneksi gagal", async ({ page }) => {
  await page.goto("/simulator");
  const start = page.getByRole("button", { name: "Jalankan Simulasi" });
  await expect(start).toBeEnabled();
  let releaseRequest: () => void = () => undefined;
  const waitForRelease = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route("**/api/v1/simulations/preview", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await waitForRelease;
    await route.abort();
  });
  await start.click();
  await expect(page.getByRole("button", { name: /menjalankan|menghitung/i })).toBeDisabled();
  releaseRequest();
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toBeVisible();
  await page.unroute("**/api/v1/simulations/preview");
  await alert.getByRole("button", { name: "Coba Lagi" }).click();
  await expect(page.getByRole("main").getByText(rupiah("450.000")).first()).toBeVisible();
});
