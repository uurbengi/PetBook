const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type File {
    url: String!
  }

  type Notification {
    id: ID!
    recipient: User!
    message: String!
    listing: Listing
    isRead: Boolean!
    createdAt: String!
  }

  type Pet {
    name: String
    age: Int
    breed: String
    gender: String
  }

  type Comment {
    id: ID
    text: String
    author: User
    createdAt: String
  }

  type Listing {
    id: ID!
    title: String!
    description: String!
    type: String!
    pet: Pet
    image: String
    user: User
    comments: [Comment]
    isClosed: Boolean!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    token: String
  }

  type Query {
    myListings: [Listing]
    listings(type: String): [Listing]
    listing(id: ID!): Listing
    notifications: [Notification]
    unreadNotificationsCount: Int
    me: User
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User
    markAllNotificationsAsRead: Boolean
    login(username: String!, password: String!): User
    addListing(
      title: String!
      description: String!
      type: String!
      pet: PetInput
      image: String
    ): Listing

    addComment(listingId: ID!, text: String!): Listing
    deleteComment(commentId: ID!): Boolean!
    deleteListing(id: ID!): Boolean
    updateListing(
      id: ID!
      title: String
      description: String
      type: String
      pet: PetInput
      image: String
    ): Listing
    closeListing(id: ID!): Listing
    uploadFile(file: Upload!): File
  }

  input PetInput {
    name: String
    age: Int
    breed: String
    gender: String
  }
`;

module.exports = typeDefs;
