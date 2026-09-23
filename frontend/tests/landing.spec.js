import { test, expect } from "@playwright/test";

test("scroll sequence advances actual frames and low-data mode restores the poster", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const canvas = page.locator(".film-sequence canvas");
  await expect
    .poll(() =>
      canvas.evaluate(
        (c) => c.getContext("2d").getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  const first = await canvas.evaluate((c) => c.toDataURL());
  await expect(canvas).toHaveAttribute("data-loaded", "150");
  await canvas.evaluate((c) => {
    window.playedFrames = [];
    new MutationObserver(() =>
      window.playedFrames.push(Number(c.dataset.frame)),
    ).observe(c, { attributes: true, attributeFilter: ["data-frame"] });
  });
  await page.evaluate(() => {
    const section = document.querySelector(".film-sequence");
    scrollTo(0, (section.offsetHeight - innerHeight) * 0.9);
  });
  await expect
    .poll(() => canvas.evaluate((c) => c.toDataURL()))
    .not.toBe(first);
  await expect(canvas).toHaveAttribute("data-frame", "150", { timeout: 10000 });
  expect(await page.evaluate(() => window.playedFrames)).toEqual(
    Array.from({ length: 149 }, (_, i) => i + 2),
  );
  await page.evaluate(() => scrollTo(0, 0));
  await expect(canvas).toHaveAttribute("data-frame", "1", { timeout: 10000 });
  await expect.poll(() => canvas.evaluate((c) => c.toDataURL())).toBe(first);
  await page.evaluate(() => {
    localStorage.setItem("onona-lite", "true");
  });
  await page.reload();
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => canvas.evaluate((c) => c.toDataURL())).toBe(first);
});
