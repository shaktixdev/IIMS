import { Router, Request, Response, NextFunction } from "express";
import Warehouse from "../models/Warehouse.model.js";
import { getWarehouseStats, getWarehouseStock, getRecentMovements } from "../services/warehouse.service.js";

const router = Router();

// GET /api/warehouses
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/warehouses
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, name, type, address, manager, zones } = req.body;

    if (!code || !name) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Warehouse code and name are required.",
        },
      });
      return;
    }

    // Check if code is already used
    const existing = await Warehouse.findOne({ code: code.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: `Warehouse with code ${code.toUpperCase()} already exists.`,
        },
      });
      return;
    }

    const warehouse = new Warehouse({
      code,
      name,
      type: type || "main",
      address: address || {},
      manager: manager || undefined,
      zones: zones || [],
    });

    await warehouse.save();

    res.status(201).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/warehouses/:id
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, address, manager, zones, isActive } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Warehouse not found.",
        },
      });
      return;
    }

    if (name !== undefined) warehouse.name = name;
    if (type !== undefined) warehouse.type = type;
    if (address !== undefined) warehouse.address = address;
    if (manager !== undefined) warehouse.manager = manager;
    if (zones !== undefined) warehouse.zones = zones;
    if (isActive !== undefined) warehouse.isActive = isActive;

    await warehouse.save();

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warehouses/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findById(id).populate("manager", "name email");
    if (!warehouse) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found." } });
      return;
    }
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

// GET /api/warehouses/:id/stock
router.get("/:id/stock", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const stock = await getWarehouseStock(id);
    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
});

// GET /api/warehouses/:id/stats
router.get("/:id/stats", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const stats = await getWarehouseStats(id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// POST /api/warehouses/:id/zones
router.post("/:id/zones", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, rows, columns } = req.body;
    if (!code || !name) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Zone code and name are required." } });
      return;
    }
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found." } });
      return;
    }
    if (warehouse.zones.some((z) => z.code.toUpperCase() === code.toUpperCase())) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: `Zone with code ${code.toUpperCase()} already exists.` } });
      return;
    }
    warehouse.zones.push({ code: code.toUpperCase(), name, rows: rows || 0, columns: columns || 0 });
    await warehouse.save();
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/warehouses/:id/zones/:zoneId
router.patch("/:id/zones/:zoneId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, zoneId } = req.params;
    const { name, rows, columns } = req.body;
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found." } });
      return;
    }
    const zoneIndex = warehouse.zones.findIndex((z: any) => z._id.toString() === zoneId);
    if (zoneIndex === -1) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Zone not found." } });
      return;
    }
    const zone = warehouse.zones[zoneIndex];
    if (name !== undefined) zone.name = name;
    if (rows !== undefined) zone.rows = rows;
    if (columns !== undefined) zone.columns = columns;
    await warehouse.save();
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/warehouses/:id/zones/:zoneId
router.delete("/:id/zones/:zoneId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, zoneId } = req.params;
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found." } });
      return;
    }
    const initialLength = warehouse.zones.length;
    warehouse.zones = warehouse.zones.filter((z: any) => z._id.toString() !== zoneId);
    if (warehouse.zones.length === initialLength) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Zone not found in warehouse." } });
      return;
    }
    await warehouse.save();
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
});

// GET /api/warehouses/:id/movements
router.get("/:id/movements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const movements = await getRecentMovements(id);
    res.status(200).json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
});

export default router;
