import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "contri-hub",
    });

    console.log("Mongo connected");
  } catch (err) {
    console.error(err);
  }
}