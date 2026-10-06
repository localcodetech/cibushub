const { default: env } = require("../config/env/env.js");

const config = {
  username: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  timezone: "+00:00",
  define: {
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_0900_ai_ci",
  },
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
