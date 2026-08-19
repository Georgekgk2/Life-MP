import { z } from "zod";

export const artisanCategoryValues = [
  "pottery",
  "textile",
  "care",
  "home",
  "gastronomy",
  "art",
  "other",
] as const;

export type ArtisanCategory = (typeof artisanCategoryValues)[number];

export const categoryOptions: readonly {
  readonly value: ArtisanCategory;
  readonly label: string;
}[] = [
  { value: "pottery", label: "Кераміка, гончарство та посуд" },
  { value: "textile", label: "Текстиль, вишивка та одяг" },
  { value: "care", label: "Натуральний догляд і косметика" },
  { value: "home", label: "Дім, декор, свічки та затишок" },
  { value: "gastronomy", label: "Крафтова гастрономія та мед" },
  { value: "art", label: "Мистецтво, графіка та сувеніри" },
  { value: "other", label: "Інше локальне ремесло" },
];

export const artisanApplicationSchema = z.object({
  name: z
    .string()
    .min(2, "Вкажіть ваше ім'я та прізвище (не менше 2 символів)")
    .max(100, "Ім'я занадто довге (максимум 100 символів)"),
  workshopName: z
    .string()
    .min(2, "Вкажіть назву вашої майстерні чи бренду (не менше 2 символів)")
    .max(100, "Назва майстерні занадто довга (максимум 100 символів)"),
  category: z.enum(artisanCategoryValues, {
    errorMap: () => ({ message: "Оберіть категорію виробів" }),
  }),
  description: z
    .string()
    .min(20, "Опишіть ваші вироби та матеріали (не менше 20 символів)")
    .max(1000, "Опис занадто довгий (максимум 1000 символів)"),
  email: z.string().email("Введіть коректну адресу електронної пошти"),
  phone: z
    .string()
    .min(10, "Введіть номер телефону (не менше 10 символів)")
    .max(20, "Номер телефону занадто довгий")
    .regex(
      /^[+]?[0-9\s\-()]{10,20}$/,
      "Введіть коректний номер телефону (наприклад, +380 67 123 45 67)",
    ),
  portfolioUrl: z
    .string()
    .max(200, "Посилання занадто довге (максимум 200 символів)")
    .optional()
    .or(z.literal("")),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({
      message: "Необхідно підтвердити згоду з правилами спільноти",
    }),
  }),
});

export type ArtisanApplicationInput = z.infer<typeof artisanApplicationSchema>;
