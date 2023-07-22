const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Amadeus = require("amadeus");

const router = express.Router();
const User = require("../models/Users");

const amadeus = new Amadeus({
  clientId: "KluH05l3RM1nbata3BxrBt16tG744W0D",
  clientSecret: "FFZJk0nzFlT1VLBW",
});

router.get("/", (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");
      res.render("landing_page", {
        user,
        title: "tripQuest",
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

router.get("/airport-lists", async (req, res) => {
  const query = req.query.query;
  // const apiUri = `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${query}`;
  // const options = {
  //   headers: {
  //     Authorization: "KluH05l3RM1nbata3BxrBt16tG744W0D", // Replace with your Amadeus API key
  //   },
  // };

  // try {
  //   const responce = await fetch(apiUri, options);
  //   if (!responce.ok) {
  //     console.log("Request failed");
  //   }

  //   const data = await responce.json();
  //   console.log(data);
  //   const airports = data.data.map((item) => item.name);
  //   res.json(airports);
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).json({ error: "Failed to fetch" });
  // }
  try {
    const responce = await amadeus.referenceData.locations.get({
      keyword: query,
      subType: "AIRPORT,CITY",
    });
    const data = responce.data;
    realData = [];
    data.map((airports) => {
      realData.push({
        port: airports.detailedName,
        code: airports.iataCode,
      });
    });
    console.log(realData);
    res.json(realData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "field to fetch" });
  }
});

router.post("/registration", async (req, res) => {
  const registrationInfo = req.body;
  bcrypt.hash(registrationInfo.password, 10, async function (err, hashed) {
    if (err) {
      console.log(err);
    }
    const newUser = await new User({
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
            "myVerySecretiveValueAsABeaver2",
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
    console.log(query);
    res.clearCookie("query");
  } else {
    search = req.query;
  }
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const responce = await amadeus.shopping.flightOffersSearch.get({
        originLocationCode: "LOS", // Nigeria
        destinationLocationCode: "NYC", // America
        departureDate: search.date, // Outbound departure date
        adults: 1, // Number of adults
        currencyCode: "USD", // Currency code for pricing
        max: 3, // Maximum number of flight offers to retrieve
      });
      const offer = responce.data;
      res.send(offer);
    } catch (error) {
      res.send(error);
    }
  } else {
    res.cookie("query", search, {
      httpOnly: true,
    });
    res.render("login");
  }

  // flightOffer = offer[0];
  // const departure = flightOffer.itineraries[0].segments[0].departure.iataCode;
  // const arrival = flightOffer.itineraries[0].segments[1].arrival.iataCode;
  // const carrier = `${flightOffer.itineraries[0].segments[0].carrierCode} ${flightOffer.itineraries[0].segments[0].number}`;
  // const duration = flightOffer.itineraries[0].duration;
  // const priceCurrency = flightOffer.price.currency;
  // const totalPrice = flightOffer.price.total;
  // const isRefundable =
  //   flightOffer.travelerPricings[0].fareOption === "STANDARD" ? "Yes" : "No";
  // const hasChangePenalty =
  //   flightOffer.travelerPricings[0].fareOption === "STANDARD" ? "Yes" : "No";

  // console.log("Departure:", departure);
  // console.log("Arrival:", arrival);
  // console.log("Carrier:", carrier);
  // console.log("Duration:", duration);
  // console.log("Price:", priceCurrency, totalPrice);
  // res.send(offer);

  // res.send({
  //   Departure: offer.itineraries.segments[0].departure.iataCode,
  //   Duration: offer.itineraries.duration,
  //   Arrival: offer.itineraries.segments[1].arrival.iataCode,
  // });
});

// {"location":"BEL","Destination":"MEX","travelers":"8","date":"2023-07-28"}

module.exports = router;

// [
//   {
//     type: "flight-offer",
//     id: "1",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-08-01",
//     lastTicketingDateTime: "2023-08-01",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT32H5M",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "I",
//               at: "2023-08-01T06:45:00",
//             },
//             arrival: {
//               iataCode: "CMN",
//               terminal: "2",
//               at: "2023-08-01T11:15:00",
//             },
//             carrierCode: "AT",
//             number: "554",
//             aircraft: { code: "73H" },
//             operating: { carrierCode: "AT" },
//             duration: "PT4H30M",
//             id: "1",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "CMN",
//               terminal: "1",
//               at: "2023-08-02T07:00:00",
//             },
//             arrival: { iataCode: "JFK", at: "2023-08-02T09:50:00" },
//             carrierCode: "AT",
//             number: "202",
//             aircraft: { code: "788" },
//             operating: { carrierCode: "AT" },
//             duration: "PT7H50M",
//             id: "2",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "781.60",
//       base: "350.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "781.60",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["AT"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "781.60", base: "350.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "1",
//             cabin: "ECONOMY",
//             fareBasis: "NA0WAAFA",
//             class: "N",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "2",
//             cabin: "ECONOMY",
//             fareBasis: "NA0WAAFA",
//             class: "N",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
// ];
