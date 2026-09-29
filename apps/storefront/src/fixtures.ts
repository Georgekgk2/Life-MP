import type {
  Category,
  CharityProject,
  Event as StorefrontEvent,
  Partner,
  Person,
  Product,
  Story,
} from "@life/types";

export const categories = [
  {
    id: "category-odiah",
    slug: "odiah",
    name: "Одяг і аксесуари",
    description: "Речі для повсякденних моментів і демонстрації каталогу.",
    imageSrc: "/images/categories/category-odiah.webp",
  },
  {
    id: "category-dim",
    slug: "dim",
    name: "Дім і затишок",
    description: "Невеликі предмети для теплих домашніх ритуалів.",
    imageSrc: "/images/categories/category-dim.webp",
  },
  {
    id: "category-knyhy",
    slug: "knyhy",
    name: "Книги й читання",
    description: "Видання та нотатки для спокійного читання.",
    imageSrc: "/images/categories/category-knyhy.webp",
  },
  {
    id: "category-kanzeliariia",
    slug: "kanzeliariia",
    name: "Канцелярія",
    description: "Прості інструменти для записів і творчих задумів.",
    imageSrc: "/images/categories/category-kanzeliariia.webp",
  },
  {
    id: "category-podarunky",
    slug: "podarunky",
    name: "Подарунки",
    description: "Знаки уваги для близьких у межах демо-вітрини.",
    imageSrc: "/images/categories/category-podarunky.webp",
  },
  {
    id: "category-maisteria",
    slug: "maisteria",
    name: "Майстерня",
    description: "Матеріали для спільних творчих занять.",
    imageSrc: "/images/categories/category-maisteria.webp",
  },
] as const satisfies readonly Category[];

type CategorySlug = (typeof categories)[number]["slug"];

export const products = [
  {
    id: "product-futbolka-svitlo",
    slug: "futbolka-svitlo",
    imageSrc: "/images/products/futbolka-svitlo.webp",
    categorySlug: "odiah",
    name: "Футболка «Світло»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 680,
    availability: "demo-only",
  },
  {
    id: "product-shoper-razom",
    slug: "shoper-razom",
    imageSrc: "/images/products/shoper-razom.webp",
    categorySlug: "odiah",
    name: "Шопер «Разом»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 390,
    availability: "demo-only",
  },
  {
    id: "product-chashka-ranok",
    slug: "chashka-ranok",
    imageSrc: "/images/products/chashka-ranok.webp",
    categorySlug: "dim",
    name: "Чашка «Ранок»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 320,
    availability: "demo-only",
  },
  {
    id: "product-svichka-vechir",
    slug: "svichka-vechir",
    imageSrc: "/images/products/svichka-vechir.webp",
    categorySlug: "dim",
    name: "Свічка «Вечір»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 260,
    availability: "demo-only",
  },
  {
    id: "product-notatnyk-istorii",
    slug: "notatnyk-istorii",
    imageSrc: "/images/products/notatnyk-istorii.webp",
    categorySlug: "knyhy",
    name: "Нотатник «Історії»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 240,
    availability: "demo-only",
  },
  {
    id: "product-zbirka-opovidan",
    slug: "zbirka-opovidan",
    imageSrc: "/images/products/zbirka-opovidan.webp",
    categorySlug: "knyhy",
    name: "Збірка оповідань «Поруч»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 310,
    availability: "demo-only",
  },
  {
    id: "product-olivtsi-kolir",
    slug: "olivtsi-kolir",
    imageSrc: "/images/products/nabir-oliva.webp",
    categorySlug: "kanzeliariia",
    name: "Набір олівців «Колір»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 180,
    availability: "demo-only",
  },
  {
    id: "product-zakladka-hvylya",
    slug: "zakladka-hvylya",
    imageSrc: "/images/products/zakladka-hvylya.webp",
    categorySlug: "kanzeliariia",
    name: "Закладка «Хвиля»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 120,
    availability: "demo-only",
  },
  {
    id: "product-lystivka-teplo",
    slug: "lystivka-teplo",
    imageSrc: "/images/products/lystivka-teplo.webp",
    categorySlug: "podarunky",
    name: "Листівка «Тепло»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 90,
    availability: "demo-only",
  },
  {
    id: "product-nabor-podarunok",
    slug: "nabor-podarunok",
    imageSrc: "/images/products/plate-berehynia.webp",
    categorySlug: "podarunky",
    name: "Подарунковий набір «Добрий знак»",
    description:
      "Демонстраційний зразок крафтового набору для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 450,
    availability: "demo-only",
  },
  {
    id: "product-nabor-tvorchist",
    slug: "nabor-tvorchist",
    imageSrc: "/images/products/nabor-tvorchist.webp",
    categorySlug: "maisteria",
    name: "Набір для творчості «Разом»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 520,
    availability: "demo-only",
  },
  {
    id: "product-plakat-spilnota",
    slug: "plakat-spilnota",
    imageSrc: "/images/products/plakat-spilnota.webp",
    categorySlug: "maisteria",
    name: "Плакат «Спільнота»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 210,
    availability: "demo-only",
  },
] as const satisfies readonly Product<CategorySlug>[];

type ProductSlug = (typeof products)[number]["slug"];

export const people = [
  {
    id: "person-olena",
    slug: "olena",
    imageSrc: "/images/people/person-olena.webp",
    name: "Олена",
    role: "Авторка майстерні",
    description:
      "Вигадана учасниця демо-спільноти, яка ділиться ідеями для читання.",
    region: "Київ",
    featuredProductSlugs: ["notatnyk-istorii", "zbirka-opovidan"],
  },
  {
    id: "person-marko",
    slug: "marko",
    imageSrc: "/images/people/person-marko.webp",
    name: "Марко",
    role: "Куратор творчих занять",
    description:
      "Вигаданий учасник демо-спільноти, який збирає прості творчі формати.",
    region: "Полтавщина",
    featuredProductSlugs: ["olivtsi-kolir", "nabor-tvorchist"],
  },
  {
    id: "person-solomiia",
    slug: "solomiia",
    imageSrc: "/images/people/person-solomiia.webp",
    name: "Соломія",
    role: "Редакторка історій",
    description:
      "Вигадана учасниця демо-спільноти, яка допомагає оформлювати короткі оповіді.",
    region: "Львів",
    featuredProductSlugs: [
      "chashka-ranok",
      "svichka-vechir",
      "zakladka-hvylya",
    ],
  },
  {
    id: "person-taras",
    slug: "taras",
    name: "Тарас",
    role: "Ведучий відкритих зустрічей",
    description:
      "Вигаданий учасник демо-спільноти, який запрошує до неквапливого діалогу.",
    region: "Карпати",
    featuredProductSlugs: ["futbolka-svitlo", "plakat-spilnota"],
  },
  {
    id: "person-nadiia",
    slug: "nadiia",
    name: "Надія",
    role: "Координаторка добрих ініціатив",
    description:
      "Вигадана учасниця демо-спільноти, яка поєднує партнерські ідеї та творчість.",
    region: "Поділля",
    featuredProductSlugs: ["shoper-razom", "lystivka-teplo", "nabor-podarunok"],
  },
] as const satisfies readonly Person<ProductSlug>[];

type PersonSlug = (typeof people)[number]["slug"];

export const stories = [
  {
    id: "story-politsia-istorii",
    slug: "politsia-istorii",
    title: "Полиця для історій",
    summary:
      "Олена показує, як короткі нотатки й вибрані оповідання стають приводом для розмови у спільноті.",
    imageSrc: "/images/stories/story-politsia.webp",
    personSlug: "olena",
    relatedProductSlugs: ["notatnyk-istorii", "zbirka-opovidan"],
  },
  {
    id: "story-kolir-maisteri",
    slug: "kolir-maisteri",
    title: "Колір у майстерні",
    summary:
      "Марко збирає ідеї для відкритого творчого столу з простими матеріалами та уважною розмовою.",
    imageSrc: "/images/stories/story-kolir.webp",
    personSlug: "marko",
    relatedProductSlugs: ["olivtsi-kolir", "nabor-tvorchist"],
  },
  {
    id: "story-ranok-spilnoty",
    slug: "ranok-spilnoty",
    title: "Ранок у спільноті",
    summary:
      "Соломія ділиться сценарієм неквапливої зустрічі з читанням, нотатками та чашкою чаю.",
    imageSrc: "/images/stories/story-ranok.webp",
    personSlug: "solomiia",
    relatedProductSlugs: ["chashka-ranok", "zakladka-hvylya"],
  },
] as const satisfies readonly Story<PersonSlug, ProductSlug>[];

export const events = [
  {
    id: "event-vidkryta-maisteria",
    slug: "vidkryta-maisteria",
    title: "Відкрита майстерня",
    summary:
      "Практична зустріч про спільну творчість, природні матеріали та уважний діалог.",
    imageSrc: "/images/events/event-maisteria.webp",
    dateLabel: "12 вересня 2026",
    timeLabel: "14:00 – 17:30",
    typeLabel: "Практичний воркшоп",
    location: "Київ, вул. Спаська, 12 (Простір «Поруч»)",
    personSlug: "taras",
    description:
      "Практична зустріч для всіх, хто цікавиться традиційними та сучасними техніками роботи з природними матеріалами. Учасники дізнаються про основи роботи з глиною, рослинними барвниками та деревом.",
    agenda: [
      {
        time: "14:00",
        title: "Знайомство та вступне слово",
        description:
          "Розмова про філософію ремесла та відповідальне ставлення до матеріалів.",
      },
      {
        time: "14:45",
        title: "Практична частина: робота з формою",
        description:
          "Створення перших пробних ескізів та освоєння базових інструментів.",
      },
      {
        time: "16:30",
        title: "Спільне обговорення та чай",
        description:
          "Обмін враженнями та обговорення ідей для наступних відкритих зустрічей.",
      },
    ],
    relatedProductSlugs: ["nabor-tvorchist", "plakat-spilnota"],
  },
  {
    id: "event-chytannia-razom",
    slug: "chytannia-razom",
    title: "Читання разом",
    summary:
      "Тихе читання та обмін враженнями від коротких історій у затишному форматі.",
    imageSrc: "/images/events/event-chytannia.webp",
    dateLabel: "26 вересня 2026",
    timeLabel: "18:30 – 20:00",
    typeLabel: "Літературний клуб",
    location: "Онлайн-трансляція для спільноти",
    personSlug: "olena",
    description:
      "Затишний формат вечірньої зустрічі, присвячений вдумливому читанню оповідань про українських ремісників та обміну особистими нотатками.",
    agenda: [
      {
        time: "18:30",
        title: "Відкриття зустрічі",
        description:
          "Представлення вибраного тексту та короткий контекст від Олени.",
      },
      {
        time: "18:45",
        title: "Сесія тихого читання",
        description:
          "30 хвилин зосередженого читання з нотатниками та закладками.",
      },
      {
        time: "19:15",
        title: "Вільний мікрофон та рефлексії",
        description: "Ділимося думками, улюбленими цитатами та асоціаціями.",
      },
    ],
    relatedProductSlugs: [
      "notatnyk-istorii",
      "zbirka-opovidan",
      "svichka-vechir",
    ],
  },
  {
    id: "event-den-dobrykh-rechei",
    slug: "den-dobrykh-rechei",
    title: "День добрих речей",
    summary:
      "Розмова про повторне використання речей, апсайклінг і творчі ідеї для спільноти.",
    imageSrc: "/images/events/event-charity.webp",
    dateLabel: "10 жовтня 2026",
    timeLabel: "11:00 – 16:00",
    typeLabel: "Ярмарок та лекторій",
    location: "Львів, пл. Ринок (Майданчик спільноти)",
    personSlug: "nadiia",
    description:
      "Свято локальної турботи про довкілля та культуру побуту. Лекції про сортування та апсайклінг, виставка робіт майстрів та благодійний збір.",
    agenda: [
      {
        time: "11:00",
        title: "Відкриття ярмарку та виставки",
        description: "Ознайомлення з експозицією робіт українських майстерень.",
      },
      {
        time: "12:30",
        title: "Лекція: «Друге життя речей»",
        description: "Як продовжити життя одягу та домашнього текстилю.",
      },
      {
        time: "14:30",
        title: "Благодійний аукціон артефактів",
        description:
          "Збір коштів на підтримку ремісничих шкіл та дитячих гуртків.",
      },
    ],
    relatedProductSlugs: ["futbolka-svitlo", "shoper-razom", "lystivka-teplo"],
  },
] as const satisfies readonly StorefrontEvent<PersonSlug, ProductSlug>[];

const demoPartnerSummary = "Приклад картки для демонстраційного каталогу.";

export const partners = [
  {
    id: "partner-veteranska-khata",
    slug: "veteranska-khata",
    name: "Демо-профіль 01",
    summary: demoPartnerSummary,
    categoryLabel: "Демонстраційний запис",
    websiteLabel: "Демо-профіль",
  },
  {
    id: "partner-tsentr-kapralova",
    slug: "tsentr-kapralova",
    name: "Демо-профіль 02",
    summary: demoPartnerSummary,
    categoryLabel: "Демонстраційний запис",
    websiteLabel: "Демо-профіль",
  },
  {
    id: "partner-tsentr-krutova",
    slug: "tsentr-krutova",
    name: "Демо-профіль 03",
    summary: demoPartnerSummary,
    categoryLabel: "Демонстраційний запис",
    websiteLabel: "Демо-профіль",
  },
  {
    id: "partner-aromaterapiia",
    slug: "aromaterapiia",
    name: "Демо-профіль 04",
    summary: demoPartnerSummary,
    categoryLabel: "Демонстраційний запис",
    websiteLabel: "Демо-профіль",
  },
  {
    id: "partner-yust",
    slug: "yust",
    name: "Демо-профіль 05",
    summary: demoPartnerSummary,
    categoryLabel: "Демонстраційний запис",
    websiteLabel: "Демо-профіль",
  },
] as const satisfies readonly Partner[];

type PartnerId = (typeof partners)[number]["id"];

export const charityProjects = [
  {
    id: "charity-tepla-polytsia",
    slug: "tepla-polytsia",
    title: "Тепла полиця для спільноти",
    summary:
      "Демонстраційний опис партнерської ініціативи: пожертви, покупки та збір даних на цій вітрині не здійснюються.",
    beneficiaryPersonSlug: "nadiia",
    partnerIds: [
      "partner-veteranska-khata",
      "partner-tsentr-kapralova",
      "partner-tsentr-krutova",
    ],
    relatedProductSlugs: ["nabor-tvorchist", "plakat-spilnota"],
    status: "demo-only",
  },
] as const satisfies readonly CharityProject<
  PersonSlug,
  PartnerId,
  ProductSlug
>[];
