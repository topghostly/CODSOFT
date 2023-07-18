const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const User = require("../models/Users");

router.get("/", (req, res) => {
  res.render("landing_page");
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/registration", (req, res) => {
  res.render("registration");
});

router.post("/registration", async (req, res) => {
  const registrationInfo = req.body;
  bcrypt.hash(registrationInfo.password, 10, async function (err, hashed) {
    if (err) {
      console.log(err);
    }
    const newUser = await new User({
      name: registrationInfo.username,
      mail: registrationInfo.usermail,
      password: hashed,
    });
    await newUser.save();
    res.redirect("/login");
  });
});

router.post("/login", async (req, res) => {
  const loginInfo = req.body;
  const existingUser = await User.findOne({ mail: loginInfo.usermail });

  if (existingUser) {
    bcrypt.compare(
      loginInfo.password,
      existingUser.password,
      function (err, result) {
        if (result) {
          res.send("login granted");
        } else {
          res.send("Incorrect password");
        }
      }
    );
  } else {
    res.send("User does not exist");
  }
});

module.exports = router;
