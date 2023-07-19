const express = require("express");
const mainRoutes = require("./routes/mainRoutes.js");
const ejs = require("ejs");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 1234;

const dbUri =
  "mongodb+srv://Ayinla:Hucrux0327@agentsite.aimurix.mongodb.net/tripQuest?retryWrites=true&w=majority";

mongoose
  .connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((results) => {
    console.log("Connected to dataBase");
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));

app.use(mainRoutes);
