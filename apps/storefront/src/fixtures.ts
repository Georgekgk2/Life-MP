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
  },
  {
    id: "category-dim",
    slug: "dim",
    name: "Дім і затишок",
    description: "Невеликі предмети для теплих домашніх ритуалів.",
  },
  {
    id: "category-knyhy",
    slug: "knyhy",
    name: "Книги й читання",
    description: "Видання та нотатки для спокійного читання.",
  },
  {
    id: "category-kanzeliariia",
    slug: "kanzeliariia",
    name: "Канцелярія",
    description: "Прості інструменти для записів і творчих задумів.",
  },
  {
    id: "category-podarunky",
    slug: "podarunky",
    name: "Подарунки",
    description: "Знаки уваги для близьких у межах демо-вітрини.",
  },
  {
    id: "category-maisteria",
    slug: "maisteria",
    name: "Майстерня",
    description: "Матеріали для спільних творчих занять.",
  },
] as const satisfies readonly Category[];

type CategorySlug = (typeof categories)[number]["slug"];

export const products = [
  {
    id: "product-futbolka-svitlo",
    slug: "futbolka-svitlo",
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
    categorySlug: "podarunky",
    name: "Набір «Добрий знак»",
    description:
      "Демо-товар для перегляду структури каталогу; оформлення замовлення недоступне.",
    priceUah: 450,
    availability: "demo-only",
  },
  {
    id: "product-nabor-tvorchist",
    slug: "nabor-tvorchist",
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
    name: "Олена",
    role: "Авторка майстерні",
    description:
      "Вигадана учасниця демо-спільноти, яка ділиться ідеями для читання.",
    featuredProductSlugs: ["notatnyk-istorii", "zbirka-opovidan"],
  },
  {
    id: "person-marko",
    slug: "marko",
    name: "Марко",
    role: "Куратор творчих занять",
    description:
      "Вигаданий учасник демо-спільноти, який збирає прості творчі формати.",
    featuredProductSlugs: ["olivtsi-kolir", "nabor-tvorchist"],
  },
  {
    id: "person-solomiia",
    slug: "solomiia",
    name: "Соломія",
    role: "Редакторка історій",
    description:
      "Вигадана учасниця демо-спільноти, яка допомагає оформлювати короткі оповіді.",
    featuredProductSlugs: ["chashka-ranok", "zakladka-hvylya"],
  },
  {
    id: "person-taras",
    slug: "taras",
    name: "Тарас",
    role: "Ведучий відкритих зустрічей",
    description:
      "Вигаданий учасник демо-спільноти, який запрошує до неквапливого діалогу.",
    featuredProductSlugs: ["futbolka-svitlo", "plakat-spilnota"],
  },
  {
    id: "person-nadiia",
    slug: "nadiia",
    name: "Надія",
    role: "Координаторка добрих ініціатив",
    description:
      "Вигадана учасниця демо-спільноти, яка поєднує партнерські ідеї та творчість.",
    featuredProductSlugs: ["shoper-razom", "lystivka-teplo"],
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
    personSlug: "olena",
    relatedProductSlugs: ["notatnyk-istorii", "zbirka-opovidan"],
  },
  {
    id: "story-kolir-maisteri",
    slug: "kolir-maisteri",
    title: "Колір у майстерні",
    summary:
      "Марко збирає ідеї для відкритого творчого столу з простими матеріалами та уважною розмовою.",
    personSlug: "marko",
    relatedProductSlugs: ["olivtsi-kolir", "nabor-tvorchist"],
  },
  {
    id: "story-ranok-spilnoty",
    slug: "ranok-spilnoty",
    title: "Ранок у спільноті",
    summary:
      "Соломія ділиться сценарієм неквапливої зустрічі з читанням, нотатками та чашкою чаю.",
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
      "Демонстраційна зустріч про спільну творчість без реєстрації, продажу чи збору даних.",
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
      "Демонстраційний формат тихого читання та обміну враженнями від коротких історій.",
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
      "Демонстраційна розмова про повторне використання речей і творчі ідеї для спільноти.",
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

export const partners = [
  {
    id: "partner-svitlo",
    slug: "svitlo",
    name: "Майстерня «Світло»",
    summary:
      "Вигаданий партнер демо-вітрини, що підтримує ідею доступних творчих матеріалів.",
    websiteLabel: "Сторінка партнера доступна лише як частина демо",
  },
  {
    id: "partner-prostir",
    slug: "prostir",
    name: "Простір «Поруч»",
    summary:
      "Вигаданий партнер демо-вітрини для прикладу локальних спільних зустрічей.",
    websiteLabel: "Сторінка партнера доступна лише як частина демо",
  },
  {
    id: "partner-kolo",
    slug: "kolo",
    name: "Ініціатива «Коло»",
    summary:
      "Вигаданий партнер демо-вітрини, що додає приклад співпраці навколо добрих ідей.",
    websiteLabel: "Сторінка партнера доступна лише як частина демо",
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
    partnerIds: ["partner-svitlo", "partner-prostir", "partner-kolo"],
    relatedProductSlugs: ["nabor-tvorchist", "plakat-spilnota"],
    status: "demo-only",
  },
] as const satisfies readonly CharityProject<
  PersonSlug,
  PartnerId,
  ProductSlug
>[];
