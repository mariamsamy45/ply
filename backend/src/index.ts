import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import skillRoutes from "./routes/skills";
import discoverRoutes from "./routes/discover";
import matchRoutes from "./routes/matches";
import requestRoutes from "./routes/requests";
import tradeRoutes from "./routes/trades";
import messageRoutes from "./routes/messages";
import reviewRoutes from "./routes/reviews";
import badgeRoutes from "./routes/badges";
import storyRoutes from "./routes/stories";
import highlightRoutes from "./routes/highlights";
import mediaRoutes from "./routes/media";
import postRoutes from "./routes/posts";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/highlights", highlightRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/posts", postRoutes);

// central error handler so a thrown error never crashes the process or leaks a stack trace
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end. Please try again." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ply API listening on port ${port}`);
});