import type { Locator, Page } from "@playwright/test";

/**
 * `CategoryPicker` renders two responsive variants of the same component:
 * - below the `md` breakpoint: a "Alege categoria" trigger button that opens a
 *   bottom-sheet `role="dialog"` with category then subcategory lists;
 * - at/above the `md` breakpoint: an always-visible two-column panel (category
 *   list + subcategory list) with no trigger button and no dialog wrapper.
 *
 * Both markup trees exist in the DOM simultaneously (toggled via CSS), so this
 * helper detects which variant is actually visible and drives it accordingly,
 * instead of assuming a native <select> (legacy UI, no longer used).
 */
export async function pickCategoryAndSubcategory(
  page: Page,
  scope: Locator,
  category: string,
  subcategory: string
): Promise<void> {
  const trigger = scope.getByRole("button", { name: /Alege categoria/i });
  const isSheetMode = await trigger.isVisible().catch(() => false);

  if (isSheetMode) {
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: category, exact: true }).click();
    if (subcategory) {
      await dialog.getByRole("button", { name: subcategory, exact: true }).click();
    } else {
      await dialog.getByRole("button", { name: /Selectează fără subcategorie/i }).click();
    }
    return;
  }

  await scope.getByRole("button", { name: category, exact: true }).click();
  if (subcategory) {
    await scope.getByRole("button", { name: subcategory, exact: true }).click();
  } else {
    await scope.getByRole("button", { name: /Fără subcategorie/i }).click();
  }
}
