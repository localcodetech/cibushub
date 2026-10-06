import User from "./user.model.js";
import Address from "./address.model.js";

User.hasMany(Address, { foreignKey: "userId", as: "addresses" });
Address.belongsTo(User, { foreignKey: "userId", as: "user" });

export { User, Address };
