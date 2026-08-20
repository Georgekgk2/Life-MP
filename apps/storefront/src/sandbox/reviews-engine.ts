import type { ProductRatingSummary, ProductReview } from "@life/types";

const REVIEWS_STORAGE_KEY = "life_mp_reviews_v1";

const INITIAL_REVIEWS: ProductReview[] = [
  {
    id: "rev_1",
    productSlug: "chashka-ranok",
    productName: "Чашка «Ранок»",
    authorName: "Олена М.",
    authorCity: "Київ",
    rating: 5,
    comment:
      "Неймовірно душевне горнятко! Текстура молочіння дуже приємна на дотик, ранкова кава смакує по-особливому. Дякую майстрині за дбайливе пакування!",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-15T10:30:00.000Z",
  },
  {
    id: "rev_2",
    productSlug: "chashka-ranok",
    productName: "Чашка «Ранок»",
    authorName: "Дмитро К.",
    authorCity: "Львів",
    rating: 5,
    comment:
      "Купував на подарунок дружині — вона в захваті. Справжня жива кераміка з Карпат, відчувається тепло рук майстра.",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-16T14:15:00.000Z",
  },
  {
    id: "rev_3",
    productSlug: "chashka-ranok",
    productName: "Чашка «Ранок»",
    authorName: "Марія В.",
    authorCity: "Івано-Франківськ",
    rating: 4,
    comment:
      "Гарна якість, об'єм ідеальний. Доставка Новою Поштою зайняла 2 дні. Рекомендую!",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-17T09:00:00.000Z",
  },
  {
    id: "rev_4",
    productSlug: "shoper-razom",
    productName: "Шопер «Разом»",
    authorName: "Софія Г.",
    authorCity: "Тернопіль",
    rating: 5,
    comment:
      "Щільний небілений льон, міцні ручки та лаконічний автентичний візерунок. Ношу щодня вже тиждень, витримує книги й покупки.",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-14T11:00:00.000Z",
  },
  {
    id: "rev_5",
    productSlug: "svichka-vechir",
    productName: "Свічка «Вечір»",
    authorName: "Оксана П.",
    authorCity: "Полтава",
    rating: 5,
    comment:
      "Аромат натурального бджолиного воску та польових трав створює неймовірний затишок у кімнаті. Дерев'яний ґніт приємно потріскує!",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-18T18:20:00.000Z",
  },
  {
    id: "rev_6",
    productSlug: "futbolka-svitlo",
    productName: "Футболка «Світло»",
    authorName: "Андрій Б.",
    authorCity: "Одеса",
    rating: 5,
    comment:
      "Дуже якісна органічна бавовна, розмір сів ідеально. Вишитий солярний символ виглядає стильно й мінімалістично.",
    verifiedPurchase: true,
    moderationStatus: "approved",
    createdAt: "2026-08-16T16:40:00.000Z",
  },
];

let inMemoryReviews: ProductReview[] | null = null;

function loadReviews(): ProductReview[] {
  if (typeof window === "undefined") {
    if (!inMemoryReviews) {
      inMemoryReviews = [...INITIAL_REVIEWS];
    }
    return inMemoryReviews;
  }
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        REVIEWS_STORAGE_KEY,
        JSON.stringify(INITIAL_REVIEWS),
      );
      return [...INITIAL_REVIEWS];
    }
    return JSON.parse(raw);
  } catch {
    return inMemoryReviews || [...INITIAL_REVIEWS];
  }
}

function saveReviews(reviews: ProductReview[]): void {
  inMemoryReviews = reviews;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // ignore
  }
}

export const ReviewsEngine = {
  getProductReviews(productSlug: string): {
    reviews: ProductReview[];
    summary: ProductRatingSummary;
  } {
    const all = loadReviews();
    const approved = all.filter(
      (r) => r.productSlug === productSlug && r.moderationStatus === "approved",
    );

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    for (const r of approved) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as
        1 | 2 | 3 | 4 | 5;
      breakdown[star]++;
      totalScore += r.rating;
    }

    const totalReviews = approved.length;
    const averageRating =
      totalReviews > 0
        ? Math.round((totalScore / totalReviews) * 10) / 10
        : 5.0;

    return {
      reviews: approved,
      summary: {
        averageRating,
        totalReviews,
        ratingBreakdown: breakdown,
      },
    };
  },

  getAllReviews(): ProductReview[] {
    return loadReviews();
  },

  submitReview(input: {
    productSlug: string;
    productName: string;
    authorName: string;
    authorCity: string;
    rating: number;
    comment: string;
  }): ProductReview {
    const all = loadReviews();
    const newReview: ProductReview = {
      id: `rev_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      productSlug: input.productSlug,
      productName: input.productName,
      authorName: input.authorName.trim(),
      authorCity: input.authorCity.trim() || "Україна",
      rating: Math.min(5, Math.max(1, input.rating)),
      comment: input.comment.trim(),
      verifiedPurchase: true,
      moderationStatus: "approved", // Auto-approved in sandbox simulation
      createdAt: new Date().toISOString(),
    };

    all.unshift(newReview);
    saveReviews(all);
    return newReview;
  },

  moderateReview(
    reviewId: string,
    decision: "approved" | "rejected",
    notes?: string,
  ): ProductReview | null {
    const all = loadReviews();
    const index = all.findIndex((r) => r.id === reviewId);
    if (index < 0) return null;

    const review = all[index]!;
    const updated: ProductReview = {
      id: review.id,
      productSlug: review.productSlug,
      productName: review.productName,
      authorName: review.authorName,
      authorCity: review.authorCity,
      rating: review.rating,
      comment: review.comment,
      verifiedPurchase: review.verifiedPurchase,
      moderationStatus: decision,
      createdAt: review.createdAt,
      ...(notes ? { moderatorNotes: notes } : {}),
    };

    all[index] = updated;
    saveReviews(all);
    return updated;
  },
};
