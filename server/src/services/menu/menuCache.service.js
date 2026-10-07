import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import { findFullMenu } from "../../repositories/menu.repository.js";

// Short life: even if a clear is ever missed, the menu fixes itself within 5 minutes
const MENU_CACHE_SECONDS = 300;

const menuKey = (restaurantId) => `cache:menu:${restaurantId}`;

// The public menu: from Redis if saved there, otherwise from MySQL (then saved) [AC-PERF-04]
export const getCachedMenu = async (restaurantId) => {
  try {
    const saved = await redis.get(menuKey(restaurantId));
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    // Redis trouble must never break the menu page: fall back to MySQL
    logger.warn({ err: error, restaurantId }, "Menu cache read failed");
  }

  const categories = await findFullMenu(restaurantId);
  const menu = categories.map((category) => category.toJSON());

  try {
    await redis.set(menuKey(restaurantId), JSON.stringify(menu), "EX", MENU_CACHE_SECONDS);
  } catch (error) {
    logger.warn({ err: error, restaurantId }, "Menu cache write failed");
  }

  return menu;
};

// Called after every menu change, so customers never see an old price for long
export const clearCachedMenu = async (restaurantId) => {
  try {
    await redis.del(menuKey(restaurantId));
  } catch (error) {
    logger.warn({ err: error, restaurantId }, "Menu cache clear failed");
  }
};
