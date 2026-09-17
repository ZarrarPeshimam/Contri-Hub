import dotenv from "dotenv";

/**
 * loadEnv
 *
 * Must be the FIRST import in backend/index.js.
 *
 * Why this file exists: in ES modules, every `import` declaration in a
 * file is hoisted and resolved/evaluated (depth-first, in source order)
 * before any other top-level code in that file runs. That means a
 * statement like:
 *
 *   import dotenv from "dotenv";
 *   import authRoutes from "./routes/authroutes.js";   // <-- imports
 *   ...                                                //     config/cloudinary.js,
 *   dotenv.config();                                   //     which reads
 *                                                       //     process.env.CLOUDINARY_*
 *                                                       //     at module-eval time
 *
 * evaluates authRoutes (and transitively config/cloudinary.js, whose
 * top-level `cloudinary.config({...})` call reads process.env
 * immediately) BEFORE dotenv.config() ever runs — so the Cloudinary
 * client gets configured with undefined credentials.
 *
 * Isolating `dotenv.config()` in its own module and importing that
 * module first (`import "./config/loadEnv.js"` as literally the first
 * line of index.js) guarantees it fully executes before any other
 * import in index.js is evaluated, so every subsequent module — including
 * config/cloudinary.js — sees populated `process.env` values.
 */
dotenv.config();