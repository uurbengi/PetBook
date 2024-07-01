const User = require("../models/User");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification");

const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");
const { GraphQLUpload } = require("graphql-upload");

const path = require("path");
const fs = require("fs");

const SECRET_KEY = "your_secret_key";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
};

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    listings: async (_, { type }) => {
      const query = type ? { type } : {};
      return await Listing.find(query)
        .populate("user")
        .populate({
          path: "comments",
          populate: { path: "author" },
        });
    },
    listing: async (_, { id }) => {
      return await Listing.findById(id)
        .populate("user")
        .populate({
          path: "comments",
          populate: { path: "author" },
        });
    },

    myListings: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      return await Listing.find({ user: user.id })
        .populate("user")
        .populate({
          path: "comments",
          populate: { path: "author" },
        });
    },

    me: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      return await User.findById(user.id);
    },

    notifications: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      return Notification.find({ recipient: user.id })
        .populate("listing")
        .sort({ createdAt: -1 });
    },
    unreadNotificationsCount: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      return Notification.countDocuments({ recipient: user.id, isRead: false });
    },
    // notifications: async (_, __, { user }) => {
    //   if (!user) throw new AuthenticationError("You are not authenticated");
    //   return await Notification.find({ recipient: user.id }).populate(
    //     "listing"
    //   );
    // },
  },
  Mutation: {
    markAllNotificationsAsRead: async (_, __, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      await Notification.updateMany(
        { recipient: user.id, isRead: false },
        { isRead: true }
      );
      return true;
    },
    register: async (_, { username, email, password }) => {
      const user = new User({ username, email, password });
      await user.save();
      const token = generateToken(user);
      return { ...user._doc, id: user._id, token };
    },
    login: async (_, { username, password }) => {
      const user = await User.findOne({ username });
      if (!user) throw new AuthenticationError("Invalid credentials");
      const valid = await user.comparePassword(password);
      if (!valid) throw new AuthenticationError("Invalid credentials");
      const token = generateToken(user);
      return { ...user._doc, id: user._id, token };
    },
    addListing: async (
      _,
      { title, description, type, pet, image },
      { user }
    ) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      const listing = new Listing({
        title,
        description,
        type,
        pet,
        image,
        user: user.id,
      });
      await listing.save();
      return listing.populate("user");
    },
    addComment: async (_, { listingId, text }, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      const listing = await Listing.findById(listingId);
      if (!listing) throw new Error("Listing not found");
      const comment = {
        text,
        author: user.id,
        createdAt: new Date(),
      };
      listing.comments.push(comment);
      await listing.save();

      // Bildirim oluşturma
      const notification = new Notification({
        recipient: listing.user,
        message: `Yeni yorum: ${text}`,
        listing: listingId,
      });
      await notification.save();

      await listing.populate("user");
      await listing.populate({
        path: "comments",
        populate: { path: "author" },
      });
      return listing;
    },

    deleteComment: async (_, { commentId }, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");

      // Yorumu içeren Listing'i bul
      const listing = await Listing.findOne({ "comments._id": commentId });
      if (!listing) throw new Error("Listing not found");

      // Yorumu listing'den al
      const comment = listing.comments.id(commentId);
      if (!comment) throw new Error("Comment not found");

      // Yorumun sahibinin doğrulanması
      if (comment.author.toString() !== user.id) {
        throw new AuthenticationError(
          "You are not authorized to delete this comment"
        );
      }

      // Yorumu sil
      listing.comments.pull({ _id: commentId });
      await listing.save();

      return true;
    },

    deleteListing: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      const listing = await Listing.findById(id);
      if (!listing) throw new Error("Listing not found");
      if (listing.user.toString() !== user.id)
        throw new AuthenticationError(
          "You are not authorized to delete this listing"
        );
      await listing.deleteOne();
      return true;
    },

    updateListing: async (
      _,
      { id, title, description, type, pet, image },
      { user }
    ) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      const listing = await Listing.findById(id);
      if (!listing) throw new Error("Listing not found");
      if (listing.user.toString() !== user.id)
        throw new AuthenticationError(
          "You are not authorized to update this listing"
        );

      if (title) listing.title = title;
      if (description) listing.description = description;
      if (type) listing.type = type;
      if (pet) listing.pet = pet;
      if (image) listing.image = image;

      await listing.save();
      return listing.populate("user");
    },
    closeListing: async (_, { id }, { user }) => {
      if (!user) throw new AuthenticationError("You are not authenticated");
      const listing = await Listing.findById(id);
      if (!listing) throw new Error("Listing not found");
      if (listing.user.toString() !== user.id)
        throw new AuthenticationError(
          "You are not authorized to close this listing"
        );
      listing.isClosed = true;
      await listing.save();
      return listing.populate("user");
    },

    uploadFile: async (_, { file }) => {
      const { createReadStream, filename, mimetype, encoding } = await file;
      const stream = createReadStream();
      const filePath = path.join(
        __dirname,
        `../uploads/${Date.now()}-${filename}`
      );
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream).on("finish", resolve).on("error", reject);
      });

      return {
        url: `http://localhost:4000/uploads/${path.basename(filePath)}`,
      };
    },
  },
};

module.exports = resolvers;
