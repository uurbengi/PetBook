const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  name: String,
  age: Number,
  breed: String,
  gender: String,
});

const commentSchema = new mongoose.Schema({
  text: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const listingSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  pet: petSchema,
  image: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  comments: [commentSchema],
  isClosed: {
    type: Boolean,
    default: false,
  },
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
