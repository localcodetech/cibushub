import express from "express";
import helmet from "helmet"
import cors from "cors";
import env from "./config/env/env.js";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import {randomUUID} from "node:crypto";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(pinoHttp({logger, genReqId: ()=> randomUUID()}));

app.use(helmet());

app.use(cors({origin: env.CLIENT_URL, credentials: true}));

app.use(express.json({limit: "100kb"}));




app.get("/", (req, res)=>{
  res.status(200).json({message: "ok"})
})

app.use(notFound);

app.use(errorHandler);


export default app;
