// ─────────────────────────────────────────────
// Load every model (always import models from this file, so the links below exist)
// ─────────────────────────────────────────────
import User from "./user.model.js";
import Address from "./address.model.js";
import RefreshToken from "./refreshToken.model.js";
import OAuthAccount from "./oauthAccount.model.js";
import Restaurant from "./restaurant/restaurant.model.js";
import OpeningHours from "./restaurant/openingHours.model.js";
import RestaurantDocument from "./restaurant/restaurantDocument.model.js";
import MenuCategory from "./menu/menuCategory.model.js";
import MenuItem from "./menu/menuItem.model.js";
import OptionGroup from "./menu/optionGroup.model.js";
import Option from "./menu/option.model.js";
import AuditLog from "./auditLog.model.js";
import Order from "./order/order.model.js";
import OrderItem from "./order/orderItem.model.js";
import OrderItemOption from "./order/orderItemOption.model.js";
import OrderStatusHistory from "./order/orderStatusHistory.model.js";
import Payment from "./order/payment.model.js";
import Refund from "./order/refund.model.js";
import RiderProfile from "./rider/riderProfile.model.js";
import RiderDocument from "./rider/riderDocument.model.js";
import RiderLocation from "./rider/riderLocation.model.js";
import NotificationLog from "./notification/notificationLog.model.js";
import Delivery from "./delivery/delivery.model.js";
import DeliveryOffer from "./delivery/deliveryOffer.model.js";

// ─────────────────────────────────────────────
// A user has many saved delivery addresses
// ─────────────────────────────────────────────
User.hasMany(Address, { foreignKey: "userId", as: "addresses" });
Address.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─────────────────────────────────────────────
// A user has many login sessions (one refresh token per device)
// ─────────────────────────────────────────────
User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─────────────────────────────────────────────
// A user can link a Google and an Apple account
// ─────────────────────────────────────────────
User.hasMany(OAuthAccount, { foreignKey: "userId", as: "oauthAccounts" });
OAuthAccount.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─────────────────────────────────────────────
// An owner has many restaurants
// ─────────────────────────────────────────────
User.hasMany(Restaurant, { foreignKey: "ownerId", as: "restaurants" });
Restaurant.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

// ─────────────────────────────────────────────
// A restaurant has opening hours for each day of the week
// ─────────────────────────────────────────────
Restaurant.hasMany(OpeningHours, { foreignKey: "restaurantId", as: "openingHours" });
OpeningHours.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

// ─────────────────────────────────────────────
// A restaurant has private verification documents (FDA certificate, Ghana Card...)
// ─────────────────────────────────────────────
Restaurant.hasMany(RestaurantDocument, { foreignKey: "restaurantId", as: "documents" });
RestaurantDocument.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

// ─────────────────────────────────────────────
// A restaurant's menu has categories ("Rice Dishes", "Drinks")
// ─────────────────────────────────────────────
Restaurant.hasMany(MenuCategory, { foreignKey: "restaurantId", as: "menuCategories" });
MenuCategory.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

// ─────────────────────────────────────────────
// A restaurant has many menu items (kept here too for quick ownership checks and search)
// ─────────────────────────────────────────────
Restaurant.hasMany(MenuItem, { foreignKey: "restaurantId", as: "menuItems" });
MenuItem.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

// ─────────────────────────────────────────────
// A category holds many items
// ─────────────────────────────────────────────
MenuCategory.hasMany(MenuItem, { foreignKey: "categoryId", as: "items" });
MenuItem.belongsTo(MenuCategory, { foreignKey: "categoryId", as: "category" });

// ─────────────────────────────────────────────
// An item has option groups ("Protein", "Extras")
// ─────────────────────────────────────────────
MenuItem.hasMany(OptionGroup, { foreignKey: "menuItemId", as: "optionGroups" });
OptionGroup.belongsTo(MenuItem, { foreignKey: "menuItemId", as: "menuItem" });

// ─────────────────────────────────────────────
// An option group has options ("Chicken", "Fish")
// ─────────────────────────────────────────────
OptionGroup.hasMany(Option, { foreignKey: "optionGroupId", as: "options" });
Option.belongsTo(OptionGroup, { foreignKey: "optionGroupId", as: "optionGroup" });

// ─────────────────────────────────────────────
// An admin has many audit log rows (who did what) [AC-ADM-07]
// ─────────────────────────────────────────────
User.hasMany(AuditLog, { foreignKey: "actorId", as: "auditLogs" });
AuditLog.belongsTo(User, { foreignKey: "actorId", as: "actor" });

// ─────────────────────────────────────────────
// A customer places many orders; a restaurant receives many orders
// ─────────────────────────────────────────────
User.hasMany(Order, { foreignKey: "customerId", as: "orders" });
Order.belongsTo(User, { foreignKey: "customerId", as: "customer" });
Restaurant.hasMany(Order, { foreignKey: "restaurantId", as: "orders" });
Order.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

// ─────────────────────────────────────────────
// An order holds frozen copies of its items, and each item of its chosen options
// ─────────────────────────────────────────────
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });
OrderItem.hasMany(OrderItemOption, { foreignKey: "orderItemId", as: "options" });
OrderItemOption.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });

// ─────────────────────────────────────────────
// An order keeps a history of every status change [AC-ORD-04]
// ─────────────────────────────────────────────
Order.hasMany(OrderStatusHistory, { foreignKey: "orderId", as: "statusHistory" });
OrderStatusHistory.belongsTo(Order, { foreignKey: "orderId", as: "order" });
OrderStatusHistory.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });

// ─────────────────────────────────────────────
// An order has one payment attempt per try (a failed card, then mobile money...) [AC-PAY-14]
// ─────────────────────────────────────────────
Order.hasMany(Payment, { foreignKey: "orderId", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// ─────────────────────────────────────────────
// An order can have refunds, each paid back to one successful payment [AC-CANC-04]
// ─────────────────────────────────────────────
Order.hasMany(Refund, { foreignKey: "orderId", as: "refunds" });
Refund.belongsTo(Order, { foreignKey: "orderId", as: "order" });
Payment.hasMany(Refund, { foreignKey: "paymentId", as: "refunds" });
Refund.belongsTo(Payment, { foreignKey: "paymentId", as: "payment" });

// ─────────────────────────────────────────────
// A rider account has one rider profile (vehicle, Ghana Card), with private documents
// ─────────────────────────────────────────────
User.hasOne(RiderProfile, { foreignKey: "userId", as: "riderProfile" });
RiderProfile.belongsTo(User, { foreignKey: "userId", as: "user" });
RiderProfile.hasMany(RiderDocument, { foreignKey: "riderProfileId", as: "documents" });
RiderDocument.belongsTo(RiderProfile, { foreignKey: "riderProfileId", as: "riderProfile" });
RiderProfile.hasMany(RiderLocation, { foreignKey: "riderProfileId", as: "locations" });
RiderLocation.belongsTo(RiderProfile, { foreignKey: "riderProfileId", as: "riderProfile" });

// ─────────────────────────────────────────────
// An order has one delivery; a rider carries many over time.
// Each delivery has the offers made to riders while searching.
// ─────────────────────────────────────────────
Order.hasOne(Delivery, { foreignKey: "orderId", as: "delivery" });
Delivery.belongsTo(Order, { foreignKey: "orderId", as: "order" });
RiderProfile.hasMany(Delivery, { foreignKey: "riderProfileId", as: "deliveries" });
Delivery.belongsTo(RiderProfile, { foreignKey: "riderProfileId", as: "rider" });
Delivery.hasMany(DeliveryOffer, { foreignKey: "deliveryId", as: "offers" });
DeliveryOffer.belongsTo(Delivery, { foreignKey: "deliveryId", as: "delivery" });
RiderProfile.hasMany(DeliveryOffer, { foreignKey: "riderProfileId", as: "offers" });
DeliveryOffer.belongsTo(RiderProfile, { foreignKey: "riderProfileId", as: "rider" });

export {
  NotificationLog,
  User,
  Address,
  RefreshToken,
  OAuthAccount,
  Restaurant,
  OpeningHours,
  RestaurantDocument,
  MenuCategory,
  MenuItem,
  OptionGroup,
  Option,
  AuditLog,
  Order,
  OrderItem,
  OrderItemOption,
  OrderStatusHistory,
  Payment,
  Refund,
  RiderProfile,
  RiderDocument,
  RiderLocation,
  Delivery,
  DeliveryOffer,
};
