import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";
import routeNotFoundHandler from "./middlewares/routeNotFoundHandler.js";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Site Source server is running! 🚀",
  });
});

app.use("/api/v1", router);

app.use(globalErrorHandler);
app.use(routeNotFoundHandler);

export default app;
