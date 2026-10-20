import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

let owner;
let restaurant;
let otherOwner;
let otherRestaurant;

beforeEach(async () => {
  owner = await createOwner({ status: "ACTIVE" });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

  otherOwner = await createOwner({
    status: "ACTIVE",
    email: "other@example.com",
    phone: "+233551112222",
  });
  otherRestaurant = await createTestRestaurant(otherOwner, { status: "APPROVED" });
});

const sendAs = (user, method, path, body = {}) => {
  return request(app)
    [method](path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const menuUrl = (forRestaurant, ending = "") =>
  `/api/v1/owner/restaurants/${forRestaurant.id}/menu${ending}`;

const addCategory = async (name) => {
  const response = await sendAs(owner, "post", menuUrl(restaurant, "/categories"), { name });
  return response.body.data;
};

const jollofWithProtein = (categoryId) => ({
  categoryId,
  name: "Jollof with Protein",
  pricePesewas: 4500,
  tags: ["spicy"],
  optionGroups: [
    {
      name: "Protein",
      minSelect: 1,
      maxSelect: 1,
      options: [{ name: "Chicken" }, { name: "Fish", extraPricePesewas: 500 }],
    },
    {
      name: "Extras",
      minSelect: 0,
      maxSelect: 2,
      options: [{ name: "Egg", extraPricePesewas: 300 }, { name: "Shito" }],
    },
  ],
});

const addItem = async (body) => {
  const response = await sendAs(owner, "post", menuUrl(restaurant, "/items"), body);
  return response.body.data;
};

describe("Menu categories [AC-MENU-01]", () => {
  it("adds categories at the end of the menu by default", async () => {
    const first = await addCategory("Rice Dishes");
    const second = await addCategory("Drinks");

    expect(first.displayOrder).toBe(0);
    expect(second.displayOrder).toBe(1);
  });

  it("renames and reorders a category", async () => {
    const category = await addCategory("Soups");

    const response = await sendAs(
      owner,
      "patch",
      menuUrl(restaurant, `/categories/${category.id}`),
      {
        name: "Light Soups",
        displayOrder: 5,
      },
    );

    expect(response.body.data.name).toBe("Light Soups");
    expect(response.body.data.displayOrder).toBe(5);
  });

  it("refuses to delete a category that still has items [AC-MENU-02]", async () => {
    const category = await addCategory("Rice Dishes");
    await addItem(jollofWithProtein(category.id));

    const response = await sendAs(
      owner,
      "delete",
      menuUrl(restaurant, `/categories/${category.id}`),
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CATEGORY_NOT_EMPTY");
  });

  it("deletes an empty category", async () => {
    const category = await addCategory("Desserts");

    const response = await sendAs(
      owner,
      "delete",
      menuUrl(restaurant, `/categories/${category.id}`),
    );
    const menu = await sendAs(owner, "get", menuUrl(restaurant));

    expect(response.status).toBe(200);
    expect(menu.body.data).toHaveLength(0);
  });

  it("marks every item in a category sold out at once [AC-MENU-10]", async () => {
    const category = await addCategory("Rice Dishes");
    await addItem(jollofWithProtein(category.id));
    await addItem({ categoryId: category.id, name: "Plain Rice", pricePesewas: 1500 });

    const response = await sendAs(
      owner,
      "patch",
      menuUrl(restaurant, `/categories/${category.id}/availability`),
      { isAvailable: false },
    );

    expect(response.body.data.itemsChanged).toBe(2);
    expect(await MenuItem.count({ where: { isAvailable: true } })).toBe(0);
  });
});

describe("Menu items [AC-MENU-03, AC-MENU-06]", () => {
  it("creates an item with its option groups in order", async () => {
    const category = await addCategory("Rice Dishes");

    const item = await addItem(jollofWithProtein(category.id));

    expect(item.pricePesewas).toBe(4500);
    expect(item.restaurantId).toBe(restaurant.id);
    expect(item.optionGroups.map((group) => group.name)).toEqual(["Protein", "Extras"]);
    expect(item.optionGroups[0].options.map((option) => option.name)).toEqual(["Chicken", "Fish"]);
    expect(item.optionGroups[0].options[1].extraPricePesewas).toBe(500);
  });

  it("rejects zero, negative and decimal prices [AC-MENU-04]", async () => {
    const category = await addCategory("Rice Dishes");

    for (const badPrice of [0, -500, 45.5]) {
      const response = await sendAs(owner, "post", menuUrl(restaurant, "/items"), {
        categoryId: category.id,
        name: "Waakye",
        pricePesewas: badPrice,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].field).toBe("pricePesewas");
    }
  });

  it("rejects an option group that allows more choices than it has options", async () => {
    const category = await addCategory("Rice Dishes");
    const body = jollofWithProtein(category.id);
    body.optionGroups[1].maxSelect = 5;

    const response = await sendAs(owner, "post", menuUrl(restaurant, "/items"), body);

    expect(response.status).toBe(400);
  });

  it("refuses to put an item in another restaurant's category", async () => {
    const otherCategory = await sendAs(
      otherOwner,
      "post",
      menuUrl(otherRestaurant, "/categories"),
      {
        name: "Their Category",
      },
    );

    const response = await sendAs(owner, "post", menuUrl(restaurant, "/items"), {
      categoryId: otherCategory.body.data.id,
      name: "Sneaky Item",
      pricePesewas: 1000,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe("categoryId");
  });

  it("edits the price and replaces the option groups", async () => {
    const category = await addCategory("Rice Dishes");
    const item = await addItem(jollofWithProtein(category.id));

    const response = await sendAs(owner, "patch", menuUrl(restaurant, `/items/${item.id}`), {
      pricePesewas: 5000,
      optionGroups: [
        {
          name: "Size",
          minSelect: 1,
          maxSelect: 1,
          options: [{ name: "Regular" }, { name: "Large" }],
        },
      ],
    });

    expect(response.body.data.pricePesewas).toBe(5000);
    expect(response.body.data.name).toBe("Jollof with Protein");
    expect(response.body.data.optionGroups.map((group) => group.name)).toEqual(["Size"]);
  });

  it("marks one item sold out [AC-MENU-05]", async () => {
    const category = await addCategory("Rice Dishes");
    const item = await addItem(jollofWithProtein(category.id));

    const response = await sendAs(
      owner,
      "patch",
      menuUrl(restaurant, `/items/${item.id}/availability`),
      {
        isAvailable: false,
      },
    );

    expect(response.body.data.isAvailable).toBe(false);
  });

  it("soft-deletes an item: gone from the menu, still kept for old orders [AC-MENU-09]", async () => {
    const category = await addCategory("Rice Dishes");
    const item = await addItem(jollofWithProtein(category.id));

    await sendAs(owner, "delete", menuUrl(restaurant, `/items/${item.id}`));
    const menu = await sendAs(owner, "get", menuUrl(restaurant));
    const keptRow = await MenuItem.findByPk(item.id, { paranoid: false });

    expect(menu.body.data[0].items).toHaveLength(0);
    expect(keptRow.name).toBe("Jollof with Protein");
    expect(keptRow.deletedAt).not.toBeNull();
  });

  it("sets today's stock from the daily stock [AC-MENU-07]", async () => {
    const category = await addCategory("Rice Dishes");

    const item = await addItem({ ...jollofWithProtein(category.id), dailyStock: 30 });

    expect(item.dailyStock).toBe(30);
    expect(item.stockRemaining).toBe(30);
  });
});

describe("Menu access [AC-RBAC-04, AC-AUTH-05]", () => {
  it("returns 404 when owner B edits owner A's item", async () => {
    const category = await addCategory("Rice Dishes");
    const item = await addItem(jollofWithProtein(category.id));

    const response = await sendAs(otherOwner, "patch", menuUrl(restaurant, `/items/${item.id}`), {
      pricePesewas: 1,
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 when owner B reads owner A's menu", async () => {
    const response = await sendAs(otherOwner, "get", menuUrl(restaurant));

    expect(response.status).toBe(404);
  });

  it("lets owners waiting for approval build their menu", async () => {
    await owner.update({ status: "PENDING_APPROVAL" });
    await restaurant.update({ status: "PENDING_APPROVAL" });

    const response = await sendAs(owner, "post", menuUrl(restaurant, "/categories"), {
      name: "Rice Dishes",
    });

    expect(response.status).toBe(201);
  });

  it("blocks owners whose phone is not verified", async () => {
    await owner.update({ status: "PENDING_VERIFICATION", phoneVerifiedAt: null });

    const response = await sendAs(owner, "post", menuUrl(restaurant, "/categories"), {
      name: "Rice Dishes",
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_NOT_VERIFIED");
  });

  it("refuses menu changes on a suspended restaurant", async () => {
    await restaurant.update({ status: "SUSPENDED" });

    const response = await sendAs(owner, "post", menuUrl(restaurant, "/categories"), {
      name: "Rice Dishes",
    });

    expect(response.status).toBe(403);
  });
});
