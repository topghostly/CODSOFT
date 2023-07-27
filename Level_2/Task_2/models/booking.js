const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  departure: {
    type: String,
    required: true,
  },
  arrival: {
    type: String,
    required: true,
  },
  carrier: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  journeyStartDate: {
    type: String,
    required: true,
  },
  journeyStartTime: {
    type: String,
    required: true,
  },
  journeyEndDate: {
    type: String,
    required: true,
  },
  journeyEndTime: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  gateNo: {
    type: String,
    default: 1,
  },
  flightCode: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
