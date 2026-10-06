import { Sequelize } from "sequelize";
import env from "./env/env.js";
import logger from "./logger.js";

const sequelize = new Sequelize(env.MYSQL_DATABASE, env.MYSQL_USER, env.MYSQL_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  timezone: "+00:00",
  logging: env.NODE_ENV === "development" ? (sql) => logger.debug(sql) : false,
  define: {
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_0900_ai_ci",
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
