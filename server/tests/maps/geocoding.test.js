import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import env from "../../src/config/env/env.js";
import redis from "../../src/config/redis.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

let customer;

beforeEach(async () => {
  customer = await createTestUser();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const getAs = (user, path) => {
  return request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);
};

const answer = (status, body) => ({ ok: status < 400, status, json: async () => body });

// What Nominatim answers for a pin near KNUST
const nominatimReverse = {
  display_name: "Ayeduase, Oforikrom, Kumasi, Ashanti Region, Ghana",
  address: { suburb: "Ayeduase", city: "Kumasi", country: "Ghana" },
};

// Each test needs its own "turn", or the 1-per-second throttle makes it wait
const freeTheTurn = () => redis.del("maps:nominatim:turn");

describe("GET /api/v1/customer/maps/reverse [AC-MAP-02]", () => {
  it("turns a pin into the most local area name", async () => {
    const fakeFetch = vi.fn(async () => answer(200, nominatimReverse));
    vi.stubGlobal("fetch", fakeFetch);

    const response = await getAs(
      customer,
      "/api/v1/customer/maps/reverse?latitude=6.6745&longitude=-1.5716",
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      area: "Ayeduase",
      displayName: "Ayeduase, Oforikrom, Kumasi, Ashanti Region, Ghana",
    });

    // Sends who we are, as Nominatim's rules ask
    const [url, options] = fakeFetch.mock.calls[0];
    expect(url.startsWith(`${env.GEOCODER_URL}/reverse?`)).toBe(true);
    expect(options.headers["User-Agent"]).toMatch(/^CibusHub/);
  });

  it("answers a second pin nearby from the cache, without calling the geocoder [AC-MAP-05]", async () => {
    const fakeFetch = vi.fn(async () => answer(200, nominatimReverse));
    vi.stubGlobal("fetch", fakeFetch);

    await getAs(customer, "/api/v1/customer/maps/reverse?latitude=6.67451&longitude=-1.57161");
    await freeTheTurn();
    const second = await getAs(
      customer,
      "/api/v1/customer/maps/reverse?latitude=6.67449&longitude=-1.57159",
    );

    expect(second.body.data.area).toBe("Ayeduase");
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("still answers when the geocoder is down: area is null [AC-MAP-06]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const response = await getAs(
      customer,
      "/api/v1/customer/maps/reverse?latitude=6.70&longitude=-1.60",
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ area: null, displayName: null });
  });

  it("rejects a pin outside the world's coordinates", async () => {
    const response = await getAs(
      customer,
      "/api/v1/customer/maps/reverse?latitude=95&longitude=-1.6",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("is for logged-in customers only", async () => {
    const response = await request(app).get(
      "/api/v1/customer/maps/reverse?latitude=6.67&longitude=-1.57",
    );

    expect(response.status).toBe(401);
  });
});

describe("GET /api/v1/customer/maps/search [AC-MAP-02]", () => {
  it("returns places in Ghana with numbers for coordinates", async () => {
    const fakeFetch = vi.fn(async () =>
      answer(200, [
        {
          name: "KNUST Main Library",
          display_name: "KNUST Main Library, University Road, Ayeduase, Kumasi, Ghana",
          lat: "6.6742",
          lon: "-1.5718",
          address: { suburb: "Ayeduase" },
        },
      ]),
    );
    vi.stubGlobal("fetch", fakeFetch);

    const response = await getAs(customer, "/api/v1/customer/maps/search?q=KNUST%20library");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        name: "KNUST Main Library",
        area: "Ayeduase",
        displayName: "KNUST Main Library, University Road, Ayeduase, Kumasi, Ghana",
        latitude: 6.6742,
        longitude: -1.5718,
      },
    ]);
    expect(fakeFetch.mock.calls[0][0]).toContain("countrycodes=gh");
  });

  it("says clearly when the geocoder is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => answer(503, {})),
    );

    const response = await getAs(customer, "/api/v1/customer/maps/search?q=Adum");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("MAPS_UNAVAILABLE");
  });

  it("needs at least 3 letters", async () => {
    const response = await getAs(customer, "/api/v1/customer/maps/search?q=ab");

    expect(response.status).toBe(400);
  });
});
