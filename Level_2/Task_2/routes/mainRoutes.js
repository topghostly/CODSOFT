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
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");
    } catch {
      res.clearCookie("tripQuestToken");
      res.cookie("query", search, {
        httpOnly: true,
      });
      return res.redirect("login");
    }
    try {
      const response = await amadeus.shopping.flightOffersSearch.get({
        originLocationCode: search.Location, // Nigeria
        destinationLocationCode: search.Destination, // America
        departureDate: search.date, // Outbound departure date
        adults: search.travelers, // Number of adults
        currencyCode: "NGN", // Currency code for pricing
        max: 8, // Maximum number of flight offers to retrieve
      });
      const offer = response.data;
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

        dataList.push({
          departure: flight.itineraries[0].segments[0].departure.iataCode,
          arrival:
            flight.itineraries[0].segments[numberOfStop].arrival.iataCode,
          carrier: carrierData[0].businessName,
          duration: flight.itineraries[0].duration,
          numberOfStop,
          stopLocation,
          journeyStartDate,
          journeyStartTime,
          journeyEndDate,
          journeyEndTime,
          price: flight.price.total,
        });
      }
      // const dataList = [
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TAAG Angola Airlines",
      //     duration: "PT30H20M",
      //     numberOfStop: 2,
      //     stopLocation: ["MAD", "LAD"],
      //     journeyStart: "2023-07-28T17:10:00",
      //     journeyEnd: "2023-07-29T23:30:00",
      //     price: "548609.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TAAG Angola Airlines",
      //     duration: "PT31H40M",
      //     numberOfStop: 2,
      //     stopLocation: ["MAD", "LAD"],
      //     journeyStart: "2023-07-28T15:50:00",
      //     journeyEnd: "2023-07-29T23:30:00",
      //     price: "548609.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT12H25M",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T06:45:00",
      //     journeyEnd: "2023-07-28T19:10:00",
      //     price: "600994.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT21H",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T22:10:00",
      //     journeyEnd: "2023-07-29T19:10:00",
      //     price: "600994.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT24H5M",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T19:05:00",
      //     journeyEnd: "2023-07-29T19:10:00",
      //     price: "600994.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT24H40M",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T18:30:00",
      //     journeyEnd: "2023-07-29T19:10:00",
      //     price: "600994.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT26H30M",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T16:40:00",
      //     journeyEnd: "2023-07-29T19:10:00",
      //     price: "600994.00",
      //   },
      //   {
      //     departure: "LHR",
      //     arrival: "LOS",
      //     carrier: "TURKISH AIRLINES",
      //     duration: "PT31H45M",
      //     numberOfStop: 1,
      //     stopLocation: ["IST"],
      //     journeyStart: "2023-07-28T11:25:00",
      //     journeyEnd: "2023-07-29T19:10:00",
      //     price: "600994.00",
      //   },
      // ];
      res.render("flight", {
        flights: dataList,
        title: `${search.Location} - ${search.Destination} | tripQuest Booking Service`,
      });
    } catch (error) {
      res.clearCookie("query");
      res.redirect("/");
    }
  } else {
    res.cookie("query", search, {
      httpOnly: true,
    });
    res.render("login");
  }
});

router.get("/test", async (req, res) => {
  const carrierCode = "BA";
  try {
    const responce = await amadeus.referenceData.airlines.get({
      airlineCodes: carrierCode,
    });
    const data = responce.data;
    res.send(data[0].businessName);
  } catch (error) {
    res.status(500).send({ mssg: "Could not fetch" });
  }
});

module.exports = router;

// flightOffer = offer[0];
// const departure =
//   flightOffer.itineraries[0].segments[0].departure.iataCode;
// const arrival = flightOffer.itineraries[0].segments[1].arrival.iataCode;
// const carrier = `${flightOffer.itineraries[0].segments[0].carrierCode} ${flightOffer.itineraries[0].segments[0].number}`;
// const duration = flightOffer.itineraries[0].duration;
// const priceCurrency = flightOffer.price.currency;
// const totalPrice = flightOffer.price.total;
// const isRefundable =
//   flightOffer.travelerPricings[0].fareOption === "STANDARD"
//     ? "Yes"
//     : "No";
// const hasChangePenalty =
//   flightOffer.travelerPricings[0].fareOption === "STANDARD"
//     ? "Yes"
//     : "No";

// console.log("Departure:", departure);
// console.log("Arrival:", arrival);
// console.log("Carrier:", carrier);
// console.log("Duration:", duration);
// console.log("Price:", priceCurrency, totalPrice);

// [
//   {
//     type: "flight-offer",
//     id: "1",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-07-28",
//     lastTicketingDateTime: "2023-07-28",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT16H55M",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "2",
//               at: "2023-07-28T06:45:00",
//             },
//             arrival: {
//               iataCode: "CMN",
//               terminal: "2",
//               at: "2023-07-28T11:15:00",
//             },
//             carrierCode: "AT",
//             number: "554",
//             aircraft: { code: "73H" },
//             operating: { carrierCode: "AT" },
//             duration: "PT4H30M",
//             id: "9",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "CMN",
//               terminal: "1",
//               at: "2023-07-28T15:50:00",
//             },
//             arrival: { iataCode: "JFK", at: "2023-07-28T18:40:00" },
//             carrierCode: "AT",
//             number: "200",
//             aircraft: { code: "789" },
//             operating: { carrierCode: "AT" },
//             duration: "PT7H50M",
//             id: "10",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "695.50",
//       base: "268.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "695.50",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["AT"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "695.50", base: "268.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "9",
//             cabin: "ECONOMY",
//             fareBasis: "QA0WAAFA",
//             class: "Q",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "10",
//             cabin: "ECONOMY",
//             fareBasis: "QA0WAAFA",
//             class: "Q",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
//   {
//     type: "flight-offer",
//     id: "2",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-07-28",
//     lastTicketingDateTime: "2023-07-28",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT32H5M",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "2",
//               at: "2023-07-28T06:45:00",
//             },
//             arrival: {
//               iataCode: "CMN",
//               terminal: "2",
//               at: "2023-07-28T11:15:00",
//             },
//             carrierCode: "AT",
//             number: "554",
//             aircraft: { code: "73H" },
//             operating: { carrierCode: "AT" },
//             duration: "PT4H30M",
//             id: "5",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "CMN",
//               terminal: "1",
//               at: "2023-07-29T07:00:00",
//             },
//             arrival: { iataCode: "JFK", at: "2023-07-29T09:50:00" },
//             carrierCode: "AT",
//             number: "202",
//             aircraft: { code: "789" },
//             operating: { carrierCode: "AT" },
//             duration: "PT7H50M",
//             id: "6",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "695.50",
//       base: "268.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "695.50",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["AT"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "695.50", base: "268.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "5",
//             cabin: "ECONOMY",
//             fareBasis: "QA0WAAFA",
//             class: "Q",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "6",
//             cabin: "ECONOMY",
//             fareBasis: "QA0WAAFA",
//             class: "Q",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
//   {
//     type: "flight-offer",
//     id: "3",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-07-28",
//     lastTicketingDateTime: "2023-07-28",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT24H",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "I",
//               at: "2023-07-28T14:00:00",
//             },
//             arrival: {
//               iataCode: "CAI",
//               terminal: "3",
//               at: "2023-07-28T21:50:00",
//             },
//             carrierCode: "MS",
//             number: "876",
//             aircraft: { code: "333" },
//             operating: { carrierCode: "MS" },
//             duration: "PT5H50M",
//             id: "1",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "CAI",
//               terminal: "3",
//               at: "2023-07-29T04:10:00",
//             },
//             arrival: {
//               iataCode: "JFK",
//               terminal: "1",
//               at: "2023-07-29T09:00:00",
//             },
//             carrierCode: "MS",
//             number: "985",
//             aircraft: { code: "773" },
//             operating: { carrierCode: "MS" },
//             duration: "PT11H50M",
//             id: "2",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "995.93",
//       base: "455.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "995.93",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["MS"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "995.93", base: "455.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "1",
//             cabin: "ECONOMY",
//             fareBasis: "HRENGO",
//             class: "H",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "2",
//             cabin: "ECONOMY",
//             fareBasis: "HRENGO",
//             class: "H",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
//   {
//     type: "flight-offer",
//     id: "4",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-07-28",
//     lastTicketingDateTime: "2023-07-28",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT25H",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "I",
//               at: "2023-07-28T14:00:00",
//             },
//             arrival: {
//               iataCode: "CAI",
//               terminal: "3",
//               at: "2023-07-28T21:50:00",
//             },
//             carrierCode: "MS",
//             number: "876",
//             aircraft: { code: "333" },
//             operating: { carrierCode: "MS" },
//             duration: "PT5H50M",
//             id: "3",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "CAI",
//               terminal: "3",
//               at: "2023-07-29T04:40:00",
//             },
//             arrival: {
//               iataCode: "EWR",
//               terminal: "B",
//               at: "2023-07-29T10:00:00",
//             },
//             carrierCode: "MS",
//             number: "987",
//             aircraft: { code: "789" },
//             operating: { carrierCode: "MS" },
//             duration: "PT12H20M",
//             id: "4",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "997.43",
//       base: "455.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "997.43",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["MS"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "997.43", base: "455.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "3",
//             cabin: "ECONOMY",
//             fareBasis: "HRENGO",
//             class: "H",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "4",
//             cabin: "ECONOMY",
//             fareBasis: "HRENGO",
//             class: "H",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
//   {
//     type: "flight-offer",
//     id: "5",
//     source: "GDS",
//     instantTicketingRequired: false,
//     nonHomogeneous: false,
//     oneWay: false,
//     lastTicketingDate: "2023-07-26",
//     lastTicketingDateTime: "2023-07-26",
//     numberOfBookableSeats: 9,
//     itineraries: [
//       {
//         duration: "PT19H45M",
//         segments: [
//           {
//             departure: {
//               iataCode: "LOS",
//               terminal: "I",
//               at: "2023-07-28T23:00:00",
//             },
//             arrival: {
//               iataCode: "FRA",
//               terminal: "1",
//               at: "2023-07-29T06:30:00",
//             },
//             carrierCode: "LH",
//             number: "569",
//             aircraft: { code: "333" },
//             operating: { carrierCode: "LH" },
//             duration: "PT6H30M",
//             id: "7",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//           {
//             departure: {
//               iataCode: "FRA",
//               terminal: "1",
//               at: "2023-07-29T11:00:00",
//             },
//             arrival: {
//               iataCode: "JFK",
//               terminal: "1",
//               at: "2023-07-29T13:45:00",
//             },
//             carrierCode: "LH",
//             number: "400",
//             aircraft: { code: "346" },
//             operating: { carrierCode: "LH" },
//             duration: "PT8H45M",
//             id: "8",
//             numberOfStops: 0,
//             blacklistedInEU: false,
//           },
//         ],
//       },
//     ],
//     price: {
//       currency: "USD",
//       total: "1041.65",
//       base: "561.00",
//       fees: [
//         { amount: "0.00", type: "SUPPLIER" },
//         { amount: "0.00", type: "TICKETING" },
//       ],
//       grandTotal: "1041.65",
//     },
//     pricingOptions: { fareType: ["PUBLISHED"], includedCheckedBagsOnly: true },
//     validatingAirlineCodes: ["LH"],
//     travelerPricings: [
//       {
//         travelerId: "1",
//         fareOption: "STANDARD",
//         travelerType: "ADULT",
//         price: { currency: "USD", total: "1041.65", base: "561.00" },
//         fareDetailsBySegment: [
//           {
//             segmentId: "7",
//             cabin: "ECONOMY",
//             fareBasis: "WNCO0",
//             brandedFare: "ECOSAVER",
//             class: "W",
//             includedCheckedBags: { quantity: 2 },
//           },
//           {
//             segmentId: "8",
//             cabin: "ECONOMY",
//             fareBasis: "WNCO0",
//             brandedFare: "ECOSAVER",
//             class: "W",
//             includedCheckedBags: { quantity: 2 },
//           },
//         ],
//       },
//     ],
//   },
// ];
