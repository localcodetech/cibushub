import express from "express";
import helmet from "helmet"

const app = express();

app.use(helmet())
app.use(express.json({limit: "100kb"}));


app.get("/", (req, res)=>{
  res.status(200).json({message: "ok"})
})


export default app;
