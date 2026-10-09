import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

let customer;
let otherCustomer;

beforeEach(async () => {
  customer = await createTestUser();
  otherCustomer = await createTestUser({
    email: "other@example.com",
    phone: "+233551112222",
  });
});

const sendAs = (user, method, path, body = {}) => {
  return request(app)
    [method](path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const addressesUrl = "/api/v1/customer/addresses";

// A home in Adum, Kumasi
const homeAddress = {
  label: "HOME",
  latitude: 6.6885,
  longitude: -1.6244,
  ghanaPostGps: "ak-039-5028",
  area: "Adum",
  landmark: "Opposite the Kingsway building",
  deliveryInstructions: "Call when you reach the gate",
};

describe("POST /api/v1/customer/addresses", () => {
  it("saves an address with a map pin [AC-CUST-03]", async () => {
    const response = await sendAs(customer, "post", addressesUrl, homeAddress);

    expect(response.status).toBe(201);
    expect(response.body.data.label).toBe("HOME");
    expect(response.body.data.latitude).toBe(6.6885);
    expect(response.body.data.ghanaPostGps).toBe("AK-039-5028");
    expect(response.body.data.userId).toBe(customer.id);
  });

  it("refuses an address without a map pin [AC-CUST-04]", async () => {
    const response = await sendAs(customer, "post", addressesUrl, {
      label: "HOME",
      area: "Adum",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await Address.count()).toBe(0);
  });

  it("refuses a pin outside Ghana", async () => {
    const response = await sendAs(customer, "post", addressesUrl, {
      ...homeAddress,
      latitude: 51.5074,
      longitude: -0.1278,
    });

    expect(response.status).toBe(400);
  });

  it("refuses a badly written Ghana Post GPS code", async () => {
    const response = await sendAs(customer, "post", addressesUrl, {
      ...homeAddress,
      ghanaPostGps: "12345",
    });

    expect(response.status).toBe(400);
  });

  it("refuses any attempt to save the address for someone else [AC-SEC-07]", async () => {
    const response = await sendAs(customer, "post", addressesUrl, {
      ...homeAddress,
      userId: otherCustomer.id,
    });

    expect(response.status).toBe(400);
    expect(await Address.count()).toBe(0);
  });
});

describe("GET /api/v1/customer/addresses", () => {
  it("lists only my own addresses", async () => {
    await sendAs(customer, "post", addressesUrl, homeAddress);
    await sendAs(otherCustomer, "post", addressesUrl, { ...homeAddress, label: "WORK" });

    const response = await sendAs(customer, "get", addressesUrl);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].label).toBe("HOME");
  });
});

describe("PATCH /api/v1/customer/addresses/:addressId", () => {
  it("changes only the fields sent", async () => {
    const created = await sendAs(customer, "post", addressesUrl, homeAddress);
    const addressId = created.body.data.id;

    const response = await sendAs(customer, "patch", `${addressesUrl}/${addressId}`, {
      landmark: "Behind the post office",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.landmark).toBe("Behind the post office");
    expect(response.body.data.area).toBe("Adum");
  });

  it("refuses to move only half of the pin", async () => {
    const created = await sendAs(customer, "post", addressesUrl, homeAddress);

    const response = await sendAs(customer, "patch", `${addressesUrl}/${created.body.data.id}`, {
      latitude: 6.7,
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 for another customer's address [AC-RBAC-04]", async () => {
    const created = await sendAs(otherCustomer, "post", addressesUrl, homeAddress);

    const response = await sendAs(customer, "patch", `${addressesUrl}/${created.body.data.id}`, {
      landmark: "Hacked",
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/v1/customer/addresses/:addressId", () => {
  it("deletes my address", async () => {
    const created = await sendAs(customer, "post", addressesUrl, homeAddress);

    const response = await sendAs(customer, "delete", `${addressesUrl}/${created.body.data.id}`);

    expect(response.status).toBe(200);
    expect(await Address.count()).toBe(0);
  });

  it("returns 404 for another customer's address and keeps it [AC-RBAC-04]", async () => {
    const created = await sendAs(otherCustomer, "post", addressesUrl, homeAddress);

    const response = await sendAs(customer, "delete", `${addressesUrl}/${created.body.data.id}`);

    expect(response.status).toBe(404);
    expect(await Address.count()).toBe(1);
  });
});

describe("Who can use the address endpoints [AC-RBAC-03]", () => {
  it("needs a login", async () => {
    const response = await request(app).get(addressesUrl);

    expect(response.status).toBe(401);
  });

  it("blocks restaurant owners", async () => {
    const owner = await createTestUser({
      role: "RESTAURANT_OWNER",
      email: "owner@example.com",
      phone: "+233201112222",
    });

    const response = await sendAs(owner, "get", addressesUrl);

    expect(response.status).toBe(403);
  });

  it("blocks customers who have not verified their phone", async () => {
    const unverified = await createTestUser({
      status: "PENDING_VERIFICATION",
      email: "new@example.com",
      phone: "+233209998888",
    });

    const response = await sendAs(unverified, "get", addressesUrl);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_NOT_VERIFIED");
  });
});

describe("Default address [AC-CUST-07]", () => {
  it("makes the first address the default, but not the second", async () => {
    const first = await sendAs(customer, "post", addressesUrl, homeAddress);
    const second = await sendAs(customer, "post", addressesUrl, { ...homeAddress, label: "WORK" });

    expect(first.body.data.isDefault).toBe(true);
    expect(second.body.data.isDefault).toBe(false);
  });

  it("keeps exactly one default when another is chosen", async () => {
    const first = await sendAs(customer, "post", addressesUrl, homeAddress);
    const second = await sendAs(customer, "post", addressesUrl, { ...homeAddress, label: "WORK" });

    const response = await sendAs(
      customer,
      "post",
      `${addressesUrl}/${second.body.data.id}/default`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.isDefault).toBe(true);
    const firstNow = await Address.findByPk(first.body.data.id);
    expect(firstNow.isDefault).toBe(false);
    expect(await Address.count({ where: { userId: customer.id, isDefault: true } })).toBe(1);
  });

  it("lists the default first", async () => {
    await sendAs(customer, "post", addressesUrl, homeAddress);
    const second = await sendAs(customer, "post", addressesUrl, { ...homeAddress, label: "WORK" });
    await sendAs(customer, "post", `${addressesUrl}/${second.body.data.id}/default`);

    const response = await sendAs(customer, "get", addressesUrl);

    expect(response.body.data[0].id).toBe(second.body.data.id);
  });

  it("hands the default to the newest address left when the default is deleted", async () => {
    const first = await sendAs(customer, "post", addressesUrl, homeAddress);
    const second = await sendAs(customer, "post", addressesUrl, { ...homeAddress, label: "WORK" });

    await sendAs(customer, "delete", `${addressesUrl}/${first.body.data.id}`);

    const secondNow = await Address.findByPk(second.body.data.id);
    expect(secondNow.isDefault).toBe(true);
  });

  it("can't make another customer's address the default [AC-RBAC-04]", async () => {
    const theirs = await sendAs(otherCustomer, "post", addressesUrl, homeAddress);

    const response = await sendAs(
      customer,
      "post",
      `${addressesUrl}/${theirs.body.data.id}/default`,
    );

    expect(response.status).toBe(404);
  });
});

describe("Address limit [AC-CUST-08]", () => {
  it("refuses an 11th address", async () => {
    for (let count = 0; count < 10; count++) {
      await sendAs(customer, "post", addressesUrl, homeAddress);
    }

    const response = await sendAs(customer, "post", addressesUrl, homeAddress);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ADDRESS_LIMIT_REACHED");
    expect(await Address.count({ where: { userId: customer.id } })).toBe(10);
  });
});
