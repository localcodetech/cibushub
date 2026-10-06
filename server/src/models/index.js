import User from "./user.model.js";
import Address from "./address.model.js";
import RefreshToken from "./refreshToken.model.js";

User.hasMany(Address, { foreignKey: "userId", as: "addresses" });
Address.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

export { User, Address, RefreshToken };
