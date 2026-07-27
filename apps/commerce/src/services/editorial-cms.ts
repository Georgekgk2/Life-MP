import type { Story, Event, CharityProject, Partner } from "@life/types";

export type EditorialGuide = Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string;
  categorySlug: string;
}>;

export const editorialStoriesFixture: readonly Story[] = [
  {
    id: "story_1",
    slug: "politsia-istorii",
    title: "Полісся в деталях: як Марко створює дерев'яні сувеніри",
    summary:
      "Історія про ремесло, запах сосни та збереження українських традицій.",
    personSlug: "marko",
    relatedProductSlugs: ["dereviana-malyvanka"],
  },
  {
    id: "story_2",
    slug: "kolir-maisteri",
    title: "Колір і текстура: керамічний світ Соломії",
    summary: "Як звичайна глина перетворюється на тепло щоденного вжитку.",
    personSlug: "solomiia",
    relatedProductSlugs: ["keramichny-kuhol-misto"],
  },
  {
    id: "story_3",
    slug: "ranok-spilnoty",
    title: "Ранок локального виробника: текстиль Олени",
    summary: "Текстильні вироби з натурального льону для затишного дому.",
    personSlug: "olena",
    relatedProductSlugs: ["liany-rudnyk-skatertyna"],
  },
];

export const editorialGuidesFixture: readonly EditorialGuide[] = [
  {
    id: "guide_eco_living",
    slug: "gid-ekologichnym-domom",
    title: "Гайд екологічним домом: від льону до натуральних свічок",
    summary:
      "Поради щодо облаштування побуту екологічними виробами українських ремісників.",
    categorySlug: "domivka",
  },
  {
    id: "guide_natural_snack",
    slug: "gid-korysnymy-perekusamy",
    title: "Гайд корисними перекусами для активного дня",
    summary: "Як обрати натуральні батончики та смаколики без штучних домішок.",
    categorySlug: "korysny-perekus",
  },
];

export const editorialEventsFixture: readonly Event[] = [
  {
    id: "evt_1",
    slug: "yarmarok-artysaniv-kyiv",
    title: "Ярмарок крафтових виробників у Києві",
    summary:
      "Живе спілкування з майстрами, майстер-класи та виставка кераміки.",
    dateLabel: "15 Серпня 2026",
    location: "Київ, ВДНГ",
    personSlug: "solomiia",
  },
];

export const editorialCharityProjectsFixture: readonly CharityProject[] = [
  {
    id: "charity_1",
    slug: "remeslo-dlia-peremohy",
    title: "Ремесло для перемоги: підтримка майстрів-ветеранів",
    summary: "Підтримка виготовлення сувенірів майстрами-ветеранами.",
    beneficiaryPersonSlug: "marko",
    partnerIds: ["partner_veteran_hub"],
    relatedProductSlugs: ["dereviana-malyvanka"],
    status: "demo-only",
  },
];

export const editorialPartnersFixture: readonly Partner[] = [
  {
    id: "partner_veteran_hub",
    slug: "veteran-hub",
    name: "Ветеран Хаб",
    summary: "Платформа підтримки ветеранів та їхніх бізнес-ініціатив.",
    websiteLabel: "veteranhub.com.ua",
  },
  {
    id: "partner_craft_assoc",
    slug: "craft-association-ukraine",
    name: "Асоціація Крафтовиків України",
    summary: "Спільнота локальних виготовлювачів та еко-брендів.",
    websiteLabel: "craftukraine.org",
  },
];

export class EditorialCmsService {
  async getStories(): Promise<readonly Story[]> {
    return editorialStoriesFixture;
  }

  async getGuides(): Promise<readonly EditorialGuide[]> {
    return editorialGuidesFixture;
  }

  async getEvents(): Promise<readonly Event[]> {
    return editorialEventsFixture;
  }

  async getCharityProjects(): Promise<readonly CharityProject[]> {
    return editorialCharityProjectsFixture;
  }

  async getPartners(): Promise<readonly Partner[]> {
    return editorialPartnersFixture;
  }
}
