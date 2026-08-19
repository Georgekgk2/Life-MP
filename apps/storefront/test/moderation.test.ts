import { describe, expect, it } from "vitest";
import type {
  ArtisanApplicationRecord,
  ApplicationStatus,
} from "../src/components/moderation-dashboard";

describe("Moderation Dashboard Logic", () => {
  const sampleApps: readonly ArtisanApplicationRecord[] = [
    {
      id: "app_1",
      name: "Оксана Шевченко",
      workshopName: "Майстерня «Глина»",
      category: "pottery",
      description: "Керамічний посуд ручної роботи.",
      email: "oksana@test.ua",
      phone: "+380 50 111 22 33",
      status: "pending",
      createdAt: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "app_2",
      name: "Тарас Мельник",
      workshopName: "Дерев'яний Світ",
      category: "home",
      description: "Різьблені свічники.",
      email: "taras@test.ua",
      phone: "+380 67 222 33 44",
      status: "approved",
      reviewerNotes: "Схвалено",
      createdAt: "2026-08-18T10:00:00.000Z",
    },
  ];

  it("calculates accurate metrics across application statuses", () => {
    const pendingCount = sampleApps.filter(
      (a) => a.status === "pending",
    ).length;
    const approvedCount = sampleApps.filter(
      (a) => a.status === "approved",
    ).length;

    expect(pendingCount).toBe(1);
    expect(approvedCount).toBe(1);
    expect(sampleApps.length).toBe(2);
  });

  it("filters applications by status", () => {
    const filterByStatus = (status: ApplicationStatus | "all") => {
      if (status === "all") return sampleApps;
      return sampleApps.filter((a) => a.status === status);
    };

    expect(filterByStatus("pending").length).toBe(1);
    expect(filterByStatus("pending")[0]?.id).toBe("app_1");
    expect(filterByStatus("approved").length).toBe(1);
    expect(filterByStatus("rejected").length).toBe(0);
  });

  it("filters applications by search query", () => {
    const search = (query: string) => {
      const q = query.toLowerCase();
      return sampleApps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.workshopName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q),
      );
    };

    expect(search("оксана").length).toBe(1);
    expect(search("дерев'яний").length).toBe(1);
    expect(search("unknown").length).toBe(0);
  });

  it("updates application status with review notes and metadata", () => {
    let apps = [...sampleApps];

    const updateStatus = (
      id: string,
      targetStatus: ApplicationStatus,
      notes?: string,
    ) => {
      apps = apps.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            status: targetStatus,
            reviewerNotes: notes || null,
            reviewedBy: "compliance_reviewer",
            reviewedAt: new Date().toISOString(),
          };
        }
        return a;
      });
    };

    updateStatus("app_1", "approved", "Перевірено та схвалено.");
    expect(apps.find((a) => a.id === "app_1")?.status).toBe("approved");
    expect(apps.find((a) => a.id === "app_1")?.reviewerNotes).toBe(
      "Перевірено та схвалено.",
    );
    expect(apps.find((a) => a.id === "app_1")?.reviewedBy).toBe(
      "compliance_reviewer",
    );
  });
});
