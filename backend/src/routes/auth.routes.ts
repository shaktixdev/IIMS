import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required.",
        },
      });
      return;
    }

    const emailStr = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailStr, isActive: true });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      });
      return;
    }

    if (!user.password) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        },
      });
      return;
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
