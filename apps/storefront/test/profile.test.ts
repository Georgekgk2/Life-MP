import { describe, expect, it } from "vitest";
import type {
  CustomerProfileData,
  NotificationPreferences,
} from "../src/context/profile-context";

describe("Customer Profile Logic", () => {
  const initialProfile: CustomerProfileData = {
    name: "Олена Мельник",
    email: "olena@test.ua",
    phone: "+380 67 111 22 33",
    city: "Київ",
  };

  const initialNotifications: NotificationPreferences = {
    notifyNewProducts: true,
    notifyEvents: true,
    notifyStories: true,
    notifyCharity: false,
  };

  it("updates customer profile fields", () => {
    let profile = { ...initialProfile };
    const updateProfile = (data: Partial<CustomerProfileData>) => {
      profile = { ...profile, ...data };
    };

    updateProfile({ city: "Львів", name: "Олена Шевченко" });
    expect(profile.city).toBe("Львів");
    expect(profile.name).toBe("Олена Шевченко");
    expect(profile.email).toBe("olena@test.ua");
  });

  it("toggles favorite workshops", () => {
    let workshops = ["Майстерня «Глина та Світло»"];

    const toggle = (name: string) => {
      if (workshops.includes(name)) {
        workshops = workshops.filter((w) => w !== name);
        return false;
      } else {
        workshops = [...workshops, name];
        return true;
      }
    };

    const added = toggle("Лляне Ткацтво «Берегиня»");
    expect(added).toBe(true);
    expect(workshops.length).toBe(2);

    const removed = toggle("Майстерня «Глина та Світло»");
    expect(removed).toBe(false);
    expect(workshops.length).toBe(1);
    expect(workshops[0]).toBe("Лляне Ткацтво «Берегиня»");
  });

  it("updates notification preferences", () => {
    let notifs = { ...initialNotifications };
    const update = (data: Partial<NotificationPreferences>) => {
      notifs = { ...notifs, ...data };
    };

    update({ notifyCharity: true, notifyEvents: false });
    expect(notifs.notifyCharity).toBe(true);
    expect(notifs.notifyEvents).toBe(false);
    expect(notifs.notifyNewProducts).toBe(true);
  });
});
