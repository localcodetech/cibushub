import User from "./user.model.js";
import Address from "./address.model.js";
import RefreshToken from "./refreshToken.model.js";
import Restaurant from "./restaurant/restaurant.model.js";
import OpeningHours from "./restaurant/openingHours.model.js";

User.hasMany(Address, { foreignKey: "userId", as: "addresses" });
Address.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Restaurant, { foreignKey: "ownerId", as: "restaurants" });
Restaurant.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

Restaurant.hasMany(OpeningHours, { foreignKey: "restaurantId", as: "openingHours" });
OpeningHours.belongsTo(Restaurant, { foreignKey: "restaurantId", as: "restaurant" });

export { User, Address, RefreshToken, Restaurant, OpeningHours };
