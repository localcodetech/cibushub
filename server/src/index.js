import express from "express";
// import {config} from "dotenv"
const app = express();




const PORT = Number(process.env.PORT)



app.listen(PORT, "0.0.0.0", (error)=>{
  if (error)throw error;
  console.log(`CibusHub APi is running on ${PORT}`);
});
