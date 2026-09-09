import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

describe("Storefront Route Protection Middleware", () => {
  it("blocks unauthenticated access to /moderation with 404", () => {
    const req = new NextRequest("http://localhost:3000/moderation");
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks unauthenticated access to /vendor/dashboard with 404", () => {
    const req = new NextRequest("http://localhost:3000/vendor/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks unauthenticated access to /vendor/products/new with 404", () => {
    const req = new NextRequest("http://localhost:3000/vendor/products/new");
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("blocks unauthenticated access to /profile with 404", () => {
    const req = new NextRequest("http://localhost:3000/profile");
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it("allows authenticated access to protected route when life_mp_auth_session cookie is present", () => {
    const req = new NextRequest("http://localhost:3000/moderation", {
      headers: {
        cookie: "life_mp_auth_session=valid_token_123",
      },
    });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows public access to / and /catalog without auth cookies", () => {
    const homeReq = new NextRequest("http://localhost:3000/");
    const homeRes = middleware(homeReq);
    expect(homeRes.status).toBe(200);

    const catReq = new NextRequest("http://localhost:3000/catalog");
    const catRes = middleware(catReq);
    expect(catRes.status).toBe(200);
  });
});
