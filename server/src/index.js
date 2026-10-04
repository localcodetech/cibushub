import app from "./app.js";


const PORT = Number(process.env.PORT)





const main = () =>{

  app.listen(PORT, "0.0.0.0", (error)=>{
  if (error)throw error;
  console.log(`CibusHub APi is  running on ${PORT}`);
});

}

main()
