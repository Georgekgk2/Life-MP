#!/usr/bin/env node

/**
 * Batch Image Generator for Life-MP Marketplace using Google GenAI (gemini-3.1-flash-image).
 * Generates all 31 images from the Technical Specification (ТЗ), converts them to WebP,
 * and saves them into the apps/storefront/public/images/ directory tree.
 */

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-3.1-flash-image";

function getApiKey() {
  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  )?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is required in environment to generate images.",
    );
  }
  return key;
}

// -----------------------------------------------------------------------------
// Image Tasks Definition (31 items from ТЗ)
// -----------------------------------------------------------------------------

const IMAGE_TASKS = [
  // --- Products (12 items) ---
  {
    category: "products",
    filename: "chashka-ranok.webp",
    prompt:
      "Professional product photography of a handmade artisanal ceramic coffee mug with traditional Ukrainian milk-firing (molochinnia) texture, warm terracotta and dark chocolate clay tones, minimal rustic style, sitting on a weathered natural oak table, soft morning sunlight from a window, shallow depth of field, warm cozy aesthetic, 8k resolution, authentic craftsmanship",
  },
  {
    category: "products",
    filename: "shoper-razom.webp",
    prompt:
      "Product photography of a premium eco-friendly tote bag made of raw unbleached Ukrainian natural linen fabric, subtle geometric ethnic embroidery texture, laid flat on an organic beige linen background with dry meadow herbs, clean minimalist artisan product shot, natural diffused daylight, high tactile texture",
  },
  {
    category: "products",
    filename: "futbolka-svitlo.webp",
    prompt:
      "High-end minimalist apparel photography of a heavy organic cotton unisex t-shirt in warm sand-beige color, featuring subtle embroidered Ukrainian solar craft symbol on the chest, neatly folded on a smooth pine wood surface with natural dried wheat stalks nearby, soft cinematic lighting, studio quality",
  },
  {
    category: "products",
    filename: "svichka-vechir.webp",
    prompt:
      "Close-up product photo of a handcrafted natural beeswax and soy candle inside a minimalist dark terracotta ceramic bowl, lit wooden wick with gentle golden flame, subtle Carpathian herbs pressed on wax surface, warm ambient twilight atmosphere, cozy dark pine green background",
  },
  {
    category: "products",
    filename: "notatnyk-istorii.webp",
    prompt:
      "Top-down artisan still life of a handcrafted vintage leather-bound journal notebook with recycled textured handmade paper pages, exposed brass binding and leather tie, resting beside a ceramic inkwell and wooden pen on a dark craftsman workbench",
  },
  {
    category: "products",
    filename: "med-lypa.webp",
    prompt:
      "Gourmet food photography of a clear glass jar of raw golden linden honey with kraft paper lid tied with natural twine, wooden honey dipper dripping fresh amber honey, honeycomb slice and dried linden blossoms on a rustic timber board, warm backlighting catching golden honey glow",
  },
  {
    category: "products",
    filename: "nabir-oliva.webp",
    prompt:
      "Artisan ceramic tableware set featuring a black smoked clay oil bottle and small condiment pinch bowls, matte tactile surface, drizzled virgin oil drops, fresh green herbs and linen napkin, earthy gastronomy aesthetic, soft directional light",
  },
  {
    category: "products",
    filename: "plate-berehynia.webp",
    prompt:
      "Fashion editorial product shot of a contemporary relaxed-fit natural flax linen dress in warm oatmeal tone, delicate tone-on-tone Ukrainian ethnic sleeve openwork embroidery, hanging on a minimalist birch wood hanger against an off-white plaster wall, soft airy sunlight",
  },
  {
    category: "products",
    filename: "rushnyk-polissia.webp",
    prompt:
      "Textile product photography of an authentic handwoven Ukrainian linen towel (rushnyk) with intricate red and charcoal geometric lozenge patterns, folded softly showing weave texture and fringed edges, placed on an antique wooden chest, soft authentic museum-grade lighting",
  },
  {
    category: "products",
    filename: "dereviana-taril.webp",
    prompt:
      "High-end woodwork product photo of a solid carved Ukrainian oak wood shallow serving bowl, polished with natural beeswax showing deep grain lines and chisel carving marks, holding raw walnuts and dried rosehips, dark rustic pine background",
  },
  {
    category: "products",
    filename: "traviany-chai.webp",
    prompt:
      "Organic herbal tea product photography: a craft paper pouch of wild Carpathian mountain tea blend surrounded by loose dried thyme, rosehip berries, mint leaves, and chamomile flowers, resting on a raw linen cloth next to a steaming handmade ceramic cup",
  },
  {
    category: "products",
    filename: "keramichna-vaza.webp",
    prompt:
      "Statement ceramic art piece: a tall hand-thrown terracotta vase with sculpted Ukrainian floral relief motifs, earthy matte glaze, holding dried pampas grass and wildflower stalks, standing on a stone pedestal against a textured warm sand wall, sculptural gallery lighting",
  },

  // --- Categories (6 items) ---
  {
    category: "categories",
    filename: "category-odiah.webp",
    prompt:
      "Flatlay composition of contemporary Ukrainian craft apparel: folded linen shirt, woven wool scarf, handmade leather belt, and minimalist brass jewelry on raw beige fabric, warm natural tones, editorial composition",
  },
  {
    category: "categories",
    filename: "category-dim.webp",
    prompt:
      "Cozy home interior corner with handmade ceramic cups on a wooden table, a lit beeswax candle in a clay bowl, and a soft woolen handwoven blanket on a chair, warm golden ambient light, hygge atmosphere",
  },
  {
    category: "categories",
    filename: "category-knyhy.webp",
    prompt:
      "Artistic still life of vintage hardcover books, leather bookmarks with Ukrainian embossing, open notebook with handwritten notes, and warm tea in a ceramic mug on a wooden desk near a sunlit window",
  },
  {
    category: "categories",
    filename: "category-kanzeliariia.webp",
    prompt:
      "Minimalist stationery flatlay: recycled cotton paper notebooks, wooden pencil holder, brass scissors, beeswax seal stamp, and linen twine on a clean craft surface",
  },
  {
    category: "categories",
    filename: "category-podarunky.webp",
    prompt:
      "Beautifully curated craft gift box made of raw wood, packed with wood shavings, containing a jar of honey, ceramic candle, herbal tea pouch, and a handwritten card, tied with dark green ribbon",
  },
  {
    category: "categories",
    filename: "category-maisteria.webp",
    prompt:
      "Authentic craftsman workshop scene: potter's hands shaping wet clay on a rotating pottery wheel, tools on a wooden rack, pottery shelves with unfinished vessels in background, atmospheric dust and golden sunbeams",
  },

  // --- People / Artisans (5 items) ---
  {
    category: "people",
    filename: "person-olena.webp",
    prompt:
      "Warm documentary portrait of a 32-year-old Ukrainian female ceramic artisan with a genuine kind smile, hair tied back, wearing a linen apron with dry clay smudges, sitting in her sunlit pottery workshop surrounded by ceramic mugs",
  },
  {
    category: "people",
    filename: "person-marko.webp",
    prompt:
      "Environmental portrait of a 40-year-old Ukrainian male woodworker with beard and warm thoughtful eyes, wearing a durable canvas apron, holding a hand chisel in a traditional woodcraft workshop with sawdust and oak timber",
  },
  {
    category: "people",
    filename: "person-solomiia.webp",
    prompt:
      "Portrait of a 28-year-old Ukrainian female textile artist sitting at an authentic large wooden weaving loom, smiling gently, colorful natural dyed wool yarns hanging in background, soft natural lighting",
  },
  {
    category: "people",
    filename: "person-yaroslav.webp",
    prompt:
      "Portrait of a 50-year-old Ukrainian beekeeper in an outdoor blooming wildflower garden with wooden beehives, holding a honey frame with bees, sunny Carpathian mountain hills in background, warm honest portrait",
  },
  {
    category: "people",
    filename: "person-pavlo.webp",
    prompt:
      "Candid portrait of a 35-year-old male artist carefully painting traditional ornaments with a fine brush on a terracotta plate, focused expression, warm workshop atmosphere",
  },

  // --- Stories (3 items) ---
  {
    category: "stories",
    filename: "story-politsia.webp",
    prompt:
      "A sun-drenched rustic wooden shelf in a craftsman studio displaying a collection of unique ceramic jugs, dried flowers in clay vases, and handcrafted wooden decor, serene authentic mood",
  },
  {
    category: "stories",
    filename: "story-kolir.webp",
    prompt:
      "Artisan process of natural dyeing: large ceramic pots with organic plant extracts (elderberry, oak bark, wormwood), bundles of hand-dyed linen and wool yarns hanging to dry in sunlight",
  },
  {
    category: "stories",
    filename: "story-ranok.webp",
    prompt:
      "Atmospheric outdoor craft market gathering under old trees in Kyiv: wooden market stalls displaying handmade goods, people talking and laughing, holding ceramic cups of tea, warm morning light",
  },

  // --- Events (3 items) ---
  {
    category: "events",
    filename: "event-maisteria.webp",
    prompt:
      "Group workshop scene: people of different ages happily learning pottery around wooden tables, master artisan explaining clay techniques, warm creative community atmosphere",
  },
  {
    category: "events",
    filename: "event-chytannia.webp",
    prompt:
      "Cozy evening gathering in an artisan library space: people sitting on comfortable armchairs with books, ambient candlelight and warm floor lamps, wooden bookshelves",
  },
  {
    category: "events",
    filename: "event-charity.webp",
    prompt:
      "Charity craft fair event: rustic wooden counter filled with handmade artisan gifts, smiling people choosing crafts, warm festive string lights overhead",
  },

  // --- Hero Banners (2 items) ---
  {
    category: "hero",
    filename: "hero-marketplace.webp",
    prompt:
      "Panoramic cinematic composition of authentic Ukrainian craft goods: hand-thrown ceramics, raw linen textiles, carved oak tableware, beeswax candles, and jars of mountain honey arranged on a rustic timber surface with soft sunlight and Carpathian mountain silhouette in background",
  },
  {
    category: "hero",
    filename: "hero-charity.webp",
    prompt:
      "Heartwarming close-up of two pairs of hands gently holding a handcrafted ceramic bowl with a small green sprout inside, symbol of mutual support and community care, soft warm earth tones",
  },
];

async function generateSingleImage(task, apiKey) {
  const targetDir = path.resolve(
    "apps/storefront/public/images",
    task.category,
  );
  await mkdir(targetDir, { recursive: true });

  const finalWebpPath = path.join(targetDir, task.filename);
  const tempJpgPath = path.join(
    os.tmpdir(),
    `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
  );

  const url = `${API_BASE_URL}/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            text: `Generate a high-quality, authentic photo: ${task.prompt}`,
          },
        ],
      },
    ],
  };

  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `API error (${response.status}): ${errText.slice(0, 200)}`,
        );
      }

      const data = await response.json();
      let base64Data = null;

      const part = data.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data,
      );
      if (part?.inlineData?.data) {
        base64Data = part.inlineData.data;
      }

      if (!base64Data) {
        throw new Error("No image data in candidate response");
      }

      const buffer = Buffer.from(base64Data, "base64");
      await writeFile(tempJpgPath, buffer);

      // Convert temp JPG to optimized WebP using cwebp
      try {
        await execFileAsync("cwebp", [
          "-q",
          "85",
          "-quiet",
          tempJpgPath,
          "-o",
          finalWebpPath,
        ]);
      } catch {
        // Fallback: copy as webp directly
        await writeFile(finalWebpPath, buffer);
      } finally {
        await unlink(tempJpgPath).catch(() => {});
      }

      return finalWebpPath;
    } catch (err) {
      if (attempt >= 3) {
        throw err;
      }
      console.warn(
        `[Retry ${attempt}/3] ${task.filename}: ${err.message}. Retrying in 2s...`,
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const apiKey = getApiKey();
  console.log(
    `Starting generation of ${IMAGE_TASKS.length} images using model: ${MODEL}`,
  );
  console.log(`Target directory: apps/storefront/public/images/\n`);

  let completed = 0;
  let failed = 0;

  // Process in small batches of 3 to avoid rate limits
  const BATCH_SIZE = 2;
  for (let i = 0; i < IMAGE_TASKS.length; i += BATCH_SIZE) {
    const batch = IMAGE_TASKS.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (task) => {
        const indexStr = `[${completed + failed + 1}/${IMAGE_TASKS.length}]`;
        try {
          process.stdout.write(
            `${indexStr} Generating ${task.category}/${task.filename}... `,
          );
          const startTime = Date.now();
          const outPath = await generateSingleImage(task, apiKey);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          completed++;
          console.log(`✓ DONE (${elapsed}s) -> ${path.basename(outPath)}`);
        } catch (err) {
          failed++;
          console.error(`✗ FAILED: ${err.message}`);
        }
      }),
    );

    // Small delay between batches
    if (i + BATCH_SIZE < IMAGE_TASKS.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n========================================`);
  console.log(
    `Generation completed: ${completed} successful, ${failed} failed.`,
  );
  console.log(`========================================`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
