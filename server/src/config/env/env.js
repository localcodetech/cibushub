import { envSchema } from "./env.schema.js";

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(result.error.issues);
  process.exit(1);
}

const env = result.data;

export default env;
