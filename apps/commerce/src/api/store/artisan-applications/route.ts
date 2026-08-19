import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../modules/marketplace/constants.js";

export const StoreCreateArtisanApplicationInput = z
  .object({
    name: z.string().min(2, "Вкажіть ім'я та прізвище майстра").max(100),
    workshop_name: z.string().min(2, "Вкажіть назву майстерні").max(100),
    category: z.string().min(2, "Оберіть категорію").max(50),
    description: z
      .string()
      .min(20, "Опишіть ремесло та матеріали (не менше 20 символів)")
      .max(1000),
    email: z.string().email("Введіть коректну електронну пошту"),
    phone: z.string().min(10, "Введіть коректний номер телефону").max(20),
    portfolio_url: z.string().max(200).optional().nullable(),
    accepted_terms: z.literal(true, {
      errorMap: () => ({
        message: "Необхідно підтвердити згоду з правилами спільноти",
      }),
    }),
  })
  .strict();

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parseResult = StoreCreateArtisanApplicationInput.safeParse(req.body);

  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid application payload: ${JSON.stringify(parseResult.error.errors)}`,
    );
  }

  const {
    name,
    workshop_name,
    category,
    description,
    email,
    phone,
    portfolio_url,
  } = parseResult.data;

  const marketplaceService = req.scope.resolve(MARKETPLACE_MODULE) as {
    createArtisanApplications: (
      data: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };

  const created = await marketplaceService.createArtisanApplications({
    name,
    workshop_name,
    category,
    description,
    email,
    phone,
    portfolio_url: portfolio_url || null,
    status: "pending",
  });

  res.status(201).json({
    artisan_application: created,
    message: "Заявку успішно прийнято на розгляд спільноти Life-MP.",
  });
}
