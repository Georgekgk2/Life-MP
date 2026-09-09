import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

describe("Storefront Route Protection Middleware (Fail-Closed)", () => {
  it("blocks unauthenticated access to /moderation with 404", () => {
    const req = new NextRequest("http://localhost:3000/moderation");
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks forged-cookie access to /moderation with 404 (anti-bypass regression guard)", () => {
    const req = new NextRequest("http://localhost:3000/moderation", {
      headers: {
        cookie: "life_mp_auth_session=forged-by-audit",
      },
    });
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks access to /vendor/dashboard with 404 regardless of cookies", () => {
    const req1 = new NextRequest("http://localhost:3000/vendor/dashboard");
    expect(middleware(req1).status).toBe(404);

    const req2 = new NextRequest("http://localhost:3000/vendor/dashboard", {
      headers: { cookie: "life_mp_auth_session=random_session" },
    });
    expect(middleware(req2).status).toBe(404);
  });

  it("blocks access to /vendor/products/new with 404 regardless of cookies", () => {
    const req = new NextRequest("http://localhost:3000/vendor/products/new", {
      headers: { cookie: "life_mp_auth_session=forged-token" },
    });
    expect(middleware(req).status).toBe(404);
  });

  it("blocks access to /profile with 404 regardless of cookies", () => {
    const req = new NextRequest("http://localhost:3000/profile", {
      headers: { cookie: "life_mp_auth_session=forged-token" },
    });
    expect(middleware(req).status).toBe(404);
  });

  it("allows public access to / and /catalog without restriction", () => {
    const homeReq = new NextRequest("http://localhost:3000/");
    expect(middleware(homeReq).status).toBe(200);

    const catReq = new NextRequest("http://localhost:3000/catalog");
    expect(middleware(catReq).status).toBe(200);
  });
});
