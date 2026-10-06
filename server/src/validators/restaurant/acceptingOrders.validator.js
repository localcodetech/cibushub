import { z } from "zod";

export const acceptingOrdersSchema = z
  .object({ isAcceptingOrders: z.boolean("Send true to open or false to close") })
  .strict();
