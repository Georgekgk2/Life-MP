import type { Metadata } from "next";

import { ArtisanDemoDashboard } from "@/components";

export const metadata: Metadata = {
  title: "Демо-кабінет майстра",
  description:
    "Ізольований демо-простір майстра з синтетичними виробами та локальними чернетками.",
};

export default function ArtisanDemoPage() {
  return <ArtisanDemoDashboard />;
}
