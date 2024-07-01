const { ApolloServer } = require("apollo-server-express");
const express = require("express");
const { graphqlUploadExpress } = require("graphql-upload");

const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const typeDefs = require("./schemas/typeDefs");
const resolvers = require("./resolvers");

const SECRET_KEY = "your_secret_key";

const getUser = (token) => {
  try {
    if (token) {
      const cleanedToken = token.replace("Bearer ", "");
      return jwt.verify(cleanedToken, SECRET_KEY);
    }
    return null;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const startServer = async () => {
  const app = express();

  app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization || "";
      const user = getUser(token);
      return { user };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  const httpServer = http.createServer(app);

  app.use("/uploads", express.static("uploads"));

  mongoose
    .connect(
      "mongodb+srv://uurbng:ikggmPzwF9iwQno1@petbook.qldlh3t.mongodb.net/"
    )
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB", err);
    });

  httpServer.listen({ port: 4000 }, () => {
    console.log(
      `🚀 Server ready at http://localhost:4000${server.graphqlPath}`
    );
  });
};

startServer();
