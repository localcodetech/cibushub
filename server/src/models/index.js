// ─────────────────────────────────────────────
// Load every model (always import models from this file, so the links below exist)
// ─────────────────────────────────────────────
import User from "./user.model.js";
import Address from "./address.model.js";
import RefreshToken from "./refreshToken.model.js";
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

export {
  User,
  Address,
  RefreshToken,
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
};
