import { z } from "zod";

export const vendorCategoryOptions = [
  { value: "odiah", label: "Одяг і аксесуари" },
  { value: "dim", label: "Дім і затишок" },
  { value: "knyhy", label: "Книги й читання" },
  { value: "kanzeliariia", label: "Канцелярія" },
  { value: "podarunky", label: "Подарунки" },
  { value: "maisteria", label: "Майстерня" },
] as const;

export const vendorProductSchema = z.object({
  name: z
    .string()
    .min(2, "Вкажіть назву виробу (не менше 2 символів)")
    .max(100, "Назва занадто довга (максимум 100 символів)"),
  workshopName: z
    .string()
    .min(2, "Вкажіть назву майстерні чи бренду (не менше 2 символів)")
    .max(100, "Назва майстерні занадто довга (максимум 100 символів)"),
  categorySlug: z.enum(
    ["odiah", "dim", "knyhy", "kanzeliariia", "podarunky", "maisteria"],
    {
      errorMap: () => ({ message: "Оберіть категорію каталогу" }),
    },
  ),
  description: z
    .string()
    .min(20, "Опишіть виріб, техніку та матеріали (не менше 20 символів)")
    .max(1000, "Опис занадто довгий (максимум 1000 символів)"),
  priceUah: z
    .number({ invalid_type_error: "Вкажіть коректну ціну у гривнях" })
    .int("Ціна повинна бути цілим числом")
    .min(1, "Ціна повинна бути не менше 1 ₴")
    .max(100000, "Максимальна ціна — 100 000 ₴"),
  isOrganic: z.boolean().default(false),
  isCertified: z.boolean().default(false),
  isVerifiedCraft: z.boolean().default(true),
  acceptedRules: z.literal(true, {
    errorMap: () => ({
      message: "Необхідно підтвердити відповідність стандартам спільноти",
    }),
  }),
});

export type VendorProductInput = z.infer<typeof vendorProductSchema>;
