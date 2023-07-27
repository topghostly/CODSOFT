const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Amadeus = require("amadeus");
const ObjectId = require("mongoose").Types.ObjectId;
require("dotenv").config();

const router = express.Router();
const User = require("../models/Users");
const Booking = require("../models/booking");

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_ID,
  clientSecret: process.env.AMADEUS_SECRET,
});
router.get("/", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      try {
        const userDetails = await User.findById(user.data._id);
        const bookings = await Booking.find({ user: { $eq: userDetails._id } });
        var bookingsAmount = bookings.length;
      } catch (error) {
        console.log(error);
        console.log("An error occured when getting all bookings");
      }
      res.render("landing_page", {
        user,
        title: "tripQuest",
        bookingsAmount,
      });
    } catch {
      // window.prompt("Session expired");
      res.clearCookie("tripQuestToken");
      return res.redirect("login");
    }
  } else {
    res.render("landing_page", {
      title: "tripQuest",
      user: null,
    });
  }
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
    const newUser = new User({
      firstname: registrationInfo.firstname,
      lastname: registrationInfo.lastname,
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
          const token = jwt.sign(
            { data: existingUser },
            process.env.JWT_SECRET,
            {
              expiresIn: "30m",
            }
          );
          res.cookie("tripQuestToken", token, {
            httpOnly: true,
          });
          const query = req.cookies.query;
          if (query) {
            res.redirect("/search_result");
          } else {
            res.redirect("/");
          }
        } else {
          res.send("Incorrect password");
        }
      }
    );
  } else {
    res.send("User does not exist");
  }
});

router.get("/search_result", async (req, res) => {
  const query = req.cookies.query;
  let search;
  if (query) {
    search = query;
    res.clearCookie("query");
  } else {
    search = req.query;
  }
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      res.clearCookie("tripQuestToken");
      res.cookie("query", search, {
        httpOnly: true,
      });
      return res.redirect("login");
    }
    try {
      var response = await amadeus.shopping.flightOffersSearch.get({
        originLocationCode: search.Location,
        destinationLocationCode: search.Destination,
        departureDate: search.date,
        adults: search.travelers,
        currencyCode: "NGN",
        max: 3,
      });
    } catch (error) {
      res.clearCookie("query");
      res.send({ error: error.message });
      res.redirect("/");
    }
    const offer = response.data;
    if (offer.length < 1) {
      return res.send("No flight found");
    }
    console.log(offer);
    const dataList = [];

    for (const flight of offer) {
      const carrier = flight.itineraries[0].segments[0].carrierCode;
      const stopLocation = [];
      const flightSegment = flight.itineraries[0].segments;
      const numberOfStop = flightSegment.length - 1;

      const carrierResponse = await amadeus.referenceData.airlines.get({
        airlineCodes: carrier,
      });
      const carrierData = carrierResponse.data;

      for (let i = 0; i < numberOfStop; i++) {
        stopLocation.push(flight.itineraries[0].segments[i].arrival.iataCode);
      }

      const journeyStart = flight.itineraries[0].segments[0].departure.at;
      const journeyStartDate = journeyStart.slice(0, 10);
      const journeyStartTime = journeyStart.slice(11, 16);
      const journeyEnd =
        flight.itineraries[0].segments[numberOfStop].arrival.at;
      const journeyEndDate = journeyEnd.slice(0, 10);
      const journeyEndTime = journeyEnd.slice(11, 16);
      const isRefundable =
        flight.travelerPricings[0].fareOption === "STANDARD" ? true : false;
      const hasChangePenalty =
        flight.travelerPricings[0].fareOption === "STANDARD" ? true : false;

      const gateNo = flight.itineraries[0].segments[0].departure.terminal;

      if (gateNo === "") {
        gateNo = "NA";
      }

      dataList.push({
        departure: flight.itineraries[0].segments[0].departure.iataCode,
        arrival: flight.itineraries[0].segments[numberOfStop].arrival.iataCode,
        carrier: carrierData[0].businessName,
        duration: flight.itineraries[0].duration,
        numberOfStop,
        stopLocation,
        journeyStartDate,
        journeyStartTime,
        journeyEndDate,
        journeyEndTime,
        price: flight.price.total,
        isRefundable,
        hasChangePenalty,
        gateNo,
        flightCode: flight.itineraries[0].segments[0].aircraft.code,
      });
    }
    console.log(dataList);
    res.render("flight", {
      flights: dataList,
      title: `${search.Location} - ${search.Destination} | tripQuest Booking Service`,
      date: search.date,
    });
  } else {
    res.cookie("query", search, {
      httpOnly: true,
    });
    res.render("login");
  }
});

router.get("/booking-deal", (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);

      const query = req.query;
      console.log(query);
      res.render("booking", {
        data: query,
        title: `${query.departure} - ${query.arrival} booking review`,
        user,
      });
    } catch (error) {
      res.redirect("login");
    }
  } else {
    res.redirect("login");
  }
});
router.get("/save-ticket", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const query = req.query;
      try {
        const newBooking = new Booking({
          departure: query.departure,
          arrival: query.arrival,
          carrier: query.carrier,
          duration: query.duration,
          journeyStartDate: query.journeyStartDate,
          journeyStartTime: query.journeyStartTime,
          journeyEndDate: query.journeyEndDate,
          journeyEndTime: query.journeyEndTime,
          price: query.price,
          gateNo: query.gateNo,
          flightCode: query.flightCode,
          user: user.data._id,
        });
        await newBooking.save();
        res.redirect("/");
      } catch (error) {
        console.error(error);
        res.redirect("/");
      }
    } catch (error) {
      res.redirect("login");
    }
  } else {
    res.redirect("login");
  }
});

router.get("/booking/cart", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      try {
        const userDetails = await User.findById(user.data._id);
        const bookings = await Booking.find({ user: { $eq: userDetails._id } });
        res.render("cart", {
          user: user.data,
          bookings,
          title: `${user.data.firstname} Booking details • tripQuest`,
        });
      } catch {
        console.log(error);
        res.redirect("/");
      }
    } catch (error) {
      res.clearCookie("tripQuestToken");
      return res.redirect("login");
    }
  }
});

router.get("/ticket/preview/:id", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      try {
        const id = req.params.id;
        const booking = await Booking.findById(id);

        res.render("ticket", {
          booking,
          user: user.data,
          title: `${user.data.firstname}: ${booking.departure} - ${booking.arrival} • Booking details • tripQuest`,
        });
      } catch (error) {
        res.send(error);
      }
    } catch {
      res.clearCookie("tripQuestToken");
      return res.redirect("/login");
    }
  }
});

module.exports = router;

// newInfo = {
//   departure: 'LOS',
//   arrival: 'LAX',
//   carrier: 'RWANDAIR',
//   duration: 'PT30H50M',
//   stopLocation: 'KGL,DOH',
//   journeyStartDate: '2023-07-28',
//   journeyStartTime: '15:30',
//   journeyEndDate: '2023-07-29',
//   journeyEndTime: '14:20',
//   price: '795588.00',
//   gateNo: 'I',
//   flightCode: '332'
// }

// jwtResponce = {
//   data: {
//     _id: '64bc31e648cbbc5f94af4188',
//     firstname: 'Odun',
//     lastname: 'Kadiri',
//     mail: 'odun@gmail.com',
//     password: '$2a$10$0bcJ069ZbN8loB1aqJfx3O/4KWOsqEZd8S2PWeur6eeHC/VNr9mHG',
//     createdAt: '2023-07-22T19:45:42.985Z',
//     updatedAt: '2023-07-22T19:45:42.985Z',
//     __v: 0
//   },
//   iat: 1690316114,
//   exp: 1690317914
// }
