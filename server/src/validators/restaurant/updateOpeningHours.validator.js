import { z } from "zod";
import { openingHoursField } from "./fields.js";

export const updateOpeningHoursSchema = z.object({ openingHours: openingHoursField }).strict();
