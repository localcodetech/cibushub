import app from "./app.js";
import env from "./config/env/env.js";

const PORT = env.PORT;

const main = () => {
  app.listen(PORT, "0.0.0.0", (error) => {
    if (error) throw error;
    console.log(`CibusHub APi is  running on ${PORT}`);
  });
};

main();
