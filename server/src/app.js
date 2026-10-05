import express from "express";
import helmet from "helmet";
import cors from "cors";
import env from "./config/env/env.js";

const app = express();

app.use(helmet());
app.use(cors({origin: env.CLIENT_URL, credentials: true}))
app.use(express.json({limit: "100kb"}));


app.get("/", (req, res)=>{
  res.status(200).json({message: "ok"})
})


export default app;
