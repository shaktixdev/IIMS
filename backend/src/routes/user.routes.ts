import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User, { ROLES } from "../models/User.model.js";

const router = Router();

// ─── Helper: verify requester has MANAGE_USERS permission ────────────────────
// We rely on a session token header (x-user-role) set by the frontend proxy,
// since the backend is an internal API behind Next.js.
function getCallerRole(req: Request): string {
  return (req.headers["x-user-role"] as string) || "";
}

function canManageUsers(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerRole = getCallerRole(req);
    if (!canManageUsers(callerRole)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied." } });
      return;
    }

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerRole = getCallerRole(req);
    if (!canManageUsers(callerRole)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied." } });
      return;
    }

    const { name, email, password, role, phone, department, warehouseAccess } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "name, email, password, and role are required." } });
      return;
    }

    if (!Object.values(ROLES).includes(role)) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid role specified." } });
      return;
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: "A user with that email already exists." } });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashed,
      role,
      phone: phone || "",
      department: department || "",
      warehouseAccess: warehouseAccess || [],
      isActive: true,
    });

    const { password: _pw, ...safeUser } = user.toObject();
    res.status(201).json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerRole = getCallerRole(req);
    if (!canManageUsers(callerRole)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied." } });
      return;
    }

    const { name, role, phone, department, warehouseAccess, isActive } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (role !== undefined) {
      if (!Object.values(ROLES).includes(role)) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid role." } });
        return;
      }
      updates.role = role;
    }
    if (phone !== undefined) updates.phone = phone;
    if (department !== undefined) updates.department = department;
    if (warehouseAccess !== undefined) updates.warehouseAccess = warehouseAccess;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: "-password" });
    if (!user) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/users/:id (soft deactivate — SUPER_ADMIN only) ───────────────
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerRole = getCallerRole(req);
    if (callerRole !== ROLES.SUPER_ADMIN) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only Super Admins can deactivate users." } });
      return;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true, select: "-password" });
    if (!user) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }

    res.status(200).json({ success: true, data: user, message: "User deactivated." });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/users/change-password ─────────────────────────────────────────
router.post("/change-password", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const callerId = req.headers["x-user-id"] as string;
    if (!callerId) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "currentPassword and newPassword are required." } });
      return;
    }

    if (String(newPassword).length < 6) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "New password must be at least 6 characters." } });
      return;
    }

    const user = await User.findById(callerId);
    if (!user || !user.password) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Current password is incorrect." } });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
