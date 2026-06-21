import mongoose from "mongoose";

export default function connectDB() {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongo connected"))
    .catch(err => console.error(err));
}
