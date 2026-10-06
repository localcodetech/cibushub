// ─────────────────────────────────────────────
// Load every model (always import models from this file, so the links below exist)
// ─────────────────────────────────────────────
import User from "./user.model.js";
import Address from "./address.model.js";
import RefreshToken from "./refreshToken.model.js";
import Restaurant from "./restaurant/restaurant.model.js";
import OpeningHours from "./restaurant/openingHours.model.js";

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

export { User, Address, RefreshToken, Restaurant, OpeningHours };
