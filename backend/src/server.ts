import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import unitRoutes from "./routes/unit.routes.js";
import settingRoutes from "./routes/setting.routes.js";
import warehouseRoutes from "./routes/warehouse.routes.js";
import itemRoutes from "./routes/item.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import poRoutes from "./routes/po.routes.js";
import grnRoutes from "./routes/grn.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import returnRoutes from "./routes/return.routes.js";
import userRoutes from "./routes/user.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import stockCountRoutes from "./routes/stock-count.routes.js";
import { createServer } from "http";
import { initSocketServer } from "./socket/server.js";
import alertRoutes from "./routes/alert.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { initBackgroundSchedules } from "./queue/workers.js";
// Load environment variables with override enabled
dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Setup CORS
const cleanEnvVar = (val?: string) => (val || "").replace(/['"]/g, "").trim();
const FRONTEND_URL = cleanEnvVar(process.env.FRONTEND_URL);

const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
if (FRONTEND_URL) {
  allowedOrigins.push(FRONTEND_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchase-orders", poRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/stock-counts", stockCountRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/reports", reportRoutes);


// Root test endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "IIMS API is running smoothly." });
});

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error Handler:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected server error occurred.",
    },
  });
});

// Start Server after DB connection
async function startServer() {
  await connectDB();
  const server = createServer(app);
  initSocketServer(server);
  await initBackgroundSchedules();

  server.listen(PORT, () => {
    console.log(`[IIMS API Backend] Server is running on port ${PORT}`);
  });
}

startServer();
