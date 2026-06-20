import { Router, Request, Response, NextFunction } from "express";
import Alert from "../models/Alert.model.js";
import { getIO } from "../socket/server.js";

const router = Router();

// GET /api/alerts - Retrieve list of alerts
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type, severity } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .populate("item", "name sku costPrice")
      .populate("warehouse", "name code")
      .limit(100);

    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/alerts/:id/read - Mark single alert as read
router.patch("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { status: "read" },
      { new: true }
    )
      .populate("item", "name sku costPrice")
      .populate("warehouse", "name code");

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    // Broadcast the status change in real time to all clients
    try {
      const io = getIO();
      io.emit("alert-read", id);
    } catch (socketErr) {
      console.warn("[Socket.io] Socket broadcast failed:", socketErr);
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/mark-all-read - Mark all alerts as read
router.post("/mark-all-read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await Alert.updateMany(
      { status: "unread" },
      { status: "read" }
    );

    // Broadcast the status change in real time to all clients
    try {
      const io = getIO();
      io.emit("alerts-all-read");
    } catch (socketErr) {
      console.warn("[Socket.io] Socket broadcast failed:", socketErr);
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read.`,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/alerts/:id - Delete an alert
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Check status of alert before deleting to see if we should decrement unread count
    const alertData = await Alert.findById(id);
    const wasUnread = alertData ? alertData.status === "unread" : false;

    const alert = await Alert.findByIdAndDelete(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    // Broadcast the deletion in real time to all clients
    try {
      const io = getIO();
      io.emit("alert-deleted", { id, wasUnread });
    } catch (socketErr) {
      console.warn("[Socket.io] Socket broadcast failed:", socketErr);
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
