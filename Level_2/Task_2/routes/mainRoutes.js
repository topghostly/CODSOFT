const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Amadeus = require("amadeus");
const ObjectId = require("mongoose").Types.ObjectId;

const router = express.Router();
const User = require("../models/Users");
const Booking = require("../models/booking");

const amadeus = new Amadeus({
  clientId: "KluH05l3RM1nbata3BxrBt16tG744W0D",
  clientSecret: "FFZJk0nzFlT1VLBW",
});
router.get("/", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");
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
        max: 3, // Maximum number of flight offers to retrieve
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
        const isRefundable =
          flight.travelerPricings[0].fareOption === "STANDARD" ? true : false;
        const hasChangePenalty =
          flight.travelerPricings[0].fareOption === "STANDARD" ? true : false;

        const gateNo = flight.itineraries[0].segments[0].departure.terminal;

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
          isRefundable,
          hasChangePenalty,
          gateNo,
          flightCode: flight.itineraries[0].segments[0].aircraft.code,
        });
      }
      res.render("flight", {
        flights: dataList,
        title: `${search.Location} - ${search.Destination} | tripQuest Booking Service`,
        date: search.date,
      });
    } catch (error) {
      res.clearCookie("query");
      res.send({ error: error.message });
      res.redirect("/");
    }
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
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");

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
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");
      const query = req.query;

      try {
        const newBooking = await new Booking({
          daparture: query.daparture,
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
  }
});

router.get("/booking/cart", async (req, res) => {
  const token = req.cookies.tripQuestToken;
  if (token) {
    try {
      const user = jwt.verify(token, "myVerySecretiveValueAsABeaver2");
      const userDetails = await User.findById(user.data._id);
      const bookings = await Booking.find({ user: { $eq: userDetails._id } });
      res.render("cart", {
        user,
        bookings,
        title: `${user.data.firstname} Booking details • tripQuest`,
      });
    } catch (error) {
      console.log(error);
      console.log("An error occured");
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

// flightOffer = offer[0];
// const departure =
//   flightOffer.itineraries[0].segments[0].departure.iataCode;
// const arrival = flightOffer.itineraries[0].segments[1].arrival.iataCode;
// const carrier = `${flightOffer.itineraries[0].segments[0].carrierCode} ${flightOffer.itineraries[0].segments[0].number}`;
// const duration = flightOffer.itineraries[0].duration;
// const priceCurrency = flightOffer.price.currency;
// const totalPrice = flightOffer.price.total;

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
