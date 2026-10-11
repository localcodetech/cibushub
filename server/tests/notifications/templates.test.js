import { describe, expect, it } from "vitest";
import {
  codeEmail,
  emailChangedEmail,
  noRiderFoundEmail,
  orderDeliveredEmail,
  orderRejectedEmail,
  paymentMismatchEmail,
  receiptEmail,
  refundEmail,
  restaurantReviewedEmail,
  riderReviewedEmail,
} from "../../src/services/notifications/templates/emails.js";

const receipt = {
  orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
  orderNumber: "CH-261011-123456",
  restaurantName: "Auntie Esi's Kitchen",
  restaurantAddress: "Kejetia Road, Adum, Kumasi",
  paymentMethod: "Mobile Money",
  paymentReference: "CH-REF-1",
  items: [
    { name: "Waakye", quantity: 2, options: ["Extra egg"], lineTotalPesewas: 6600 },
    { name: "Sobolo", quantity: 1, options: [], lineTotalPesewas: 1000 },
  ],
  subtotalPesewas: 7600,
  deliveryFeePesewas: 1436,
  serviceFeePesewas: 0,
  discountPesewas: 0,
  totalPesewas: 9036,
};

describe("Branded email templates [AC-NOTIF-05]", () => {
  it("every email has a subject, a full HTML page with a preview line, and plain text", () => {
    const emails = [
      codeEmail({ code: "482913", reason: "confirm your new email address", minutes: 15 }),
      receiptEmail(receipt),
      refundEmail({
        event: "started",
        amountPesewas: 9036,
        orderNumber: "CH-261011-123456",
        orderId: receipt.orderId,
        arrival: "within 1 to 3 working days",
      }),
      emailChangedEmail({ newEmail: "ama.new@example.com" }),
      orderRejectedEmail({
        orderNumber: "CH-261011-123456",
        orderId: receipt.orderId,
        restaurantName: "Auntie Esi's Kitchen",
        reason: "Kitchen closing early",
        totalPesewas: 9036,
      }),
      orderDeliveredEmail({
        orderNumber: "CH-261011-123456",
        orderId: receipt.orderId,
        restaurantName: "Auntie Esi's Kitchen",
      }),
      ...["approved", "rejected", "suspended"].flatMap((event) => [
        restaurantReviewedEmail({
          event,
          restaurantName: "Auntie Esi's Kitchen",
          reason: "Blurry photo",
        }),
        riderReviewedEmail({ event, reason: "Blurry photo" }),
      ]),
      noRiderFoundEmail({ orderNumber: "CH-261011-123456" }),
      paymentMismatchEmail({
        reference: "CH-REF-1",
        orderNumber: "CH-261011-123456",
        expected: 9036,
        received: 100,
        currency: "GHS",
      }),
    ];

    for (const email of emails) {
      expect(email.subject.length).toBeGreaterThan(5);
      expect(email.html).toMatch(/^<!doctype html>/);
      expect(email.html).toContain("CibusHub");
      expect(email.html).toContain('<div style="display:none'); // the inbox preview line
      expect(email.text).not.toMatch(/<[a-z]/i); // no HTML in the text version
      expect(email.text).toContain("CibusHub · Kumasi, Ghana");
    }
  });

  it("the receipt lists every item and the total, with a link to the order", () => {
    const email = receiptEmail(receipt);

    expect(email.subject).toBe("Your CibusHub receipt for order CH-261011-123456");
    expect(email.text).toContain("2 × Waakye (Extra egg): GHS 66.00");
    expect(email.text).toContain("Total paid: GHS 90.36");
    expect(email.text).not.toContain("Service fee"); // zero lines are left out
    expect(email.html).toContain(`/customer/orders/${receipt.orderId}`);
  });

  it("the code is in the subject and stands out", () => {
    const email = codeEmail({ code: "482913", reason: "confirm your new email", minutes: 15 });

    expect(email.subject).toBe("482913 is your CibusHub code");
    expect(email.text).toContain("482913");
    expect(email.text).toContain("expires in 15 minutes");
  });

  it("names and dishes can never become HTML (escaped)", () => {
    const email = receiptEmail({
      ...receipt,
      restaurantName: '<script>alert("x")</script>',
      items: [
        { name: "<img src=x onerror=alert(1)>", quantity: 1, options: [], lineTotalPesewas: 100 },
      ],
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("a timed-out rejection says the restaurant didn't respond, not a raw code", () => {
    const email = orderRejectedEmail({
      orderNumber: "CH-261011-123456",
      orderId: receipt.orderId,
      restaurantName: "Auntie Esi's Kitchen",
      reason: "RESTAURANT_TIMEOUT",
      totalPesewas: 9036,
    });

    expect(email.text).toContain("Auntie Esi's Kitchen didn't respond in time.");
    expect(email.text).not.toContain("RESTAURANT_TIMEOUT");
    expect(email.text).toContain("full refund of GHS 90.36");
  });
});
