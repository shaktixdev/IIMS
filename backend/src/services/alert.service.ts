import mongoose from "mongoose";
import Alert from "../models/Alert.model.js";
import Item from "../models/Item.model.js";
import Stock from "../models/Stock.model.js";
import Warehouse from "../models/Warehouse.model.js";
import { broadcastAlert } from "../socket/server.js";
import { sendEmailNotification, emailTemplates } from "./notification.service.js";

export async function createAlert(data: {
  type: "low_stock" | "expiry_warning" | "po_overdue" | "delayed_delivery" | "info";
  title: string;
  message: string;
  item?: string | mongoose.Types.ObjectId;
  warehouse?: string | mongoose.Types.ObjectId;
  referenceId?: string | mongoose.Types.ObjectId;
  referenceType?: string;
  severity: "info" | "warning" | "critical";
}) {
  try {
    const alert = new Alert({
      type: data.type,
      title: data.title,
      message: data.message,
      item: data.item || null,
      warehouse: data.warehouse || null,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      status: "unread",
      severity: data.severity,
    });

    await alert.save();

    // Populate references if we want rich objects on the frontend
    const populatedAlert = await Alert.findById(alert._id)
      .populate("item", "name sku costPrice")
      .populate("warehouse", "name code");

    // Broadcast to real-time clients
    broadcastAlert(populatedAlert);

    // Send email for critical alerts
    if (data.severity === "critical" || data.type === "low_stock") {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
      let emailHtml = "";

      if (data.type === "low_stock" && data.item) {
        const itemObj = await Item.findById(data.item);
        const whObj = data.warehouse ? await Warehouse.findById(data.warehouse) : null;
        const stockDocs = await Stock.find({ item: data.item });
        const totalQty = stockDocs.reduce((acc, curr) => acc + curr.quantityOnHand, 0);

        if (itemObj) {
          emailHtml = emailTemplates.lowStock(
            itemObj.name,
            itemObj.sku,
            totalQty,
            itemObj.minStockLevel,
            whObj ? whObj.name : "All Warehouses"
          );
        }
      } else {
        emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #d32f2f;">Critical System Alert</h2>
            <p><strong>${data.title}</strong></p>
            <p>${data.message}</p>
          </div>
        `;
      }

      if (emailHtml) {
        await sendEmailNotification(adminEmail, `[IIMS] ${data.title}`, emailHtml);
      }
    }

    return populatedAlert;
  } catch (error) {
    console.error("[Alert Service] Error creating alert:", error);
    throw error;
  }
}

export async function checkLowStockAndCreateAlert(itemId: string | mongoose.Types.ObjectId, warehouseId?: string | mongoose.Types.ObjectId) {
  try {
    const item = await Item.findById(itemId);
    if (!item || item.isDeleted || !item.isActive) return;

    // Check sum of quantityOnHand across all warehouses
    const stockRecords = await Stock.find({ item: itemId });
    const totalQtyOnHand = stockRecords.reduce((sum, record) => sum + record.quantityOnHand, 0);

    if (totalQtyOnHand < item.minStockLevel) {
      // Check if there is already an unread low_stock alert for this item
      const existingAlert = await Alert.findOne({
        item: itemId,
        type: "low_stock",
        status: "unread",
      });

      if (!existingAlert) {
        console.log(`[Alert Service] Low stock detected for: ${item.name} (${totalQtyOnHand}/${item.minStockLevel}). Generating alert.`);
        await createAlert({
          type: "low_stock",
          title: `Low Stock: ${item.name}`,
          message: `The item ${item.name} (${item.sku}) is low on stock. Current quantity is ${totalQtyOnHand} pcs, which is below the minimum threshold of ${item.minStockLevel} pcs.`,
          item: item._id as mongoose.Types.ObjectId,
          warehouse: warehouseId ? (warehouseId as mongoose.Types.ObjectId) : undefined,
          severity: "critical",
        });
      }
    }
  } catch (error) {
    console.error(`[Alert Service] Error checking low stock for item ${itemId}:`, error);
  }
}
