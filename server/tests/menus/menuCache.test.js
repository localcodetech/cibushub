import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import redis from "../../src/config/redis.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

let owner;
let restaurant;

beforeEach(async () => {
  owner = await createOwner({ status: "ACTIVE" });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
});

const ownerSends = (method, ending, body = {}) => {
  return request(app)
    [method](`/api/v1/owner/restaurants/${restaurant.id}/menu${ending}`)
    .set("Cookie", `access_token=${signAccessToken(owner)}`)
    .send(body);
};

const publicMenuPrices = async () => {
  const response = await request(app).get(`/api/v1/restaurants/${restaurant.id}`);
  return response.body.data.menu
    .flatMap((category) => category.items)
    .map((item) => item.pricePesewas);
};

describe("Public menu cache [AC-PERF-04]", () => {
  it("saves the menu in Redis after the first visit, with an expiry", async () => {
    await publicMenuPrices();

    const secondsLeft = await redis.ttl(`cache:menu:${restaurant.id}`);
    expect(secondsLeft).toBeGreaterThan(0);
    expect(secondsLeft).toBeLessThanOrEqual(300);
  });

  it("shows an owner's price change to customers straight away", async () => {
    const category = await ownerSends("post", "/categories", { name: "Rice Dishes" });
    const item = await ownerSends("post", "/items", {
      categoryId: category.body.data.id,
      name: "Jollof Rice",
      pricePesewas: 4000,
    });
    expect(await publicMenuPrices()).toEqual([4000]);

    await ownerSends("patch", `/items/${item.body.data.id}`, { pricePesewas: 4500 });

    expect(await publicMenuPrices()).toEqual([4500]);
  });

  it("removes a deleted item from the public menu straight away", async () => {
    const category = await ownerSends("post", "/categories", { name: "Rice Dishes" });
    const item = await ownerSends("post", "/items", {
      categoryId: category.body.data.id,
      name: "Jollof Rice",
      pricePesewas: 4000,
    });
    expect(await publicMenuPrices()).toEqual([4000]);

    await ownerSends("delete", `/items/${item.body.data.id}`);

    expect(await publicMenuPrices()).toEqual([]);
  });
});
