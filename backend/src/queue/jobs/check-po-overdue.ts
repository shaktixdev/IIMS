import PurchaseOrder from "../../models/PurchaseOrder.model.js";
import Batch from "../../models/Batch.model.js";
import Item from "../../models/Item.model.js";
import Alert from "../../models/Alert.model.js";
import Vendor from "../../models/Vendor.model.js";
import { createAlert, checkLowStockAndCreateAlert } from "../../services/alert.service.js";
import { sendEmailNotification, emailTemplates } from "../../services/notification.service.js";

/**
 * Checks for sent or partially received Purchase Orders that have exceeded their delivery date.
 */
export async function checkOverduePOs() {
  console.log("[Background Job] Starting check for overdue Purchase Orders...");
  try {
    const overduePOs = await PurchaseOrder.find({
      status: { $in: ["sent", "partial"] },
      deliveryDate: { $lt: new Date() },
      isDeleted: false,
    }).populate("vendor", "name");

    console.log(`[Background Job] Found ${overduePOs.length} potentially overdue Purchase Orders.`);

    for (const po of overduePOs) {
      // Check if alert already exists for this PO
      const existingAlert = await Alert.findOne({
        type: "po_overdue",
        referenceId: po._id,
      });

      if (!existingAlert) {
        console.log(`[Background Job] Creating overdue alert for PO: ${po.poNumber}`);
        
        const vendorName = (po.vendor as any)?.name || "Unknown Vendor";
        const formattedDate = po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : "N/A";
        const formattedAmount = `₹${po.grandTotal.toFixed(2)}`;

        // Create database alert
        await createAlert({
          type: "po_overdue",
          title: `Overdue PO: ${po.poNumber}`,
          message: `Purchase Order ${po.poNumber} from vendor '${vendorName}' was scheduled for delivery on ${formattedDate} but is currently overdue.`,
          referenceId: po._id as any,
          referenceType: "PurchaseOrder",
          severity: "warning",
          warehouse: po.warehouse,
        });

        // Trigger email notification
        const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
        const emailHtml = emailTemplates.poOverdue(po.poNumber, vendorName, formattedDate, formattedAmount);
        await sendEmailNotification(adminEmail, `[IIMS] Overdue PO: ${po.poNumber}`, emailHtml);
      }
    }
    console.log("[Background Job] Finished checking overdue Purchase Orders.");
  } catch (error) {
    console.error("[Background Job] Error in checkOverduePOs:", error);
  }
}

/**
 * Checks active inventory batches for upcoming expiration.
 */
export async function checkBatchExpiries() {
  console.log("[Background Job] Starting check for batch expiries...");
  try {
    const activeBatches = await Batch.find({
      status: "ACTIVE",
      expiryDate: { $ne: null },
      currentQuantity: { $gt: 0 },
    }).populate("item", "name sku expiryAlertDays");

    console.log(`[Background Job] Found ${activeBatches.length} active batches to inspect.`);
    const now = new Date();

    for (const batch of activeBatches) {
      const item = batch.item as any;
      if (!item) continue;

      const expiryAlertDays = item.expiryAlertDays || 30;
      const warningThreshold = new Date();
      warningThreshold.setDate(now.getDate() + expiryAlertDays);

      if (batch.expiryDate && batch.expiryDate <= warningThreshold) {
        const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const severity = daysLeft <= 7 ? "critical" : "warning";

        // Check if an alert already exists for this batch
        const existingAlert = await Alert.findOne({
          type: "expiry_warning",
          referenceId: batch._id,
        });

        if (!existingAlert) {
          console.log(`[Background Job] Creating expiry warning alert for batch: ${batch.batchNumber} (${daysLeft} days left)`);

          const formattedExpiry = new Date(batch.expiryDate).toLocaleDateString();

          // Create database alert
          await createAlert({
            type: "expiry_warning",
            title: `Batch Expiry Warning: ${batch.batchNumber}`,
            message: `Batch '${batch.batchNumber}' of item '${item.name}' is expiring on ${formattedExpiry} (${daysLeft} days remaining). Current stock: ${batch.currentQuantity} pcs.`,
            item: item._id,
            warehouse: batch.warehouse,
            referenceId: batch._id as any,
            referenceType: "Batch",
            severity,
          });

          // Trigger email notification for nearing expiry
          const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
          const emailHtml = emailTemplates.expiryWarning(
            item.name,
            item.sku,
            batch.batchNumber,
            formattedExpiry,
            batch.currentQuantity,
            daysLeft
          );
          await sendEmailNotification(
            adminEmail,
            `[IIMS] Batch Expiry Warning: ${batch.batchNumber} (${item.sku})`,
            emailHtml
          );
        }
      }
    }
    console.log("[Background Job] Finished checking batch expiries.");
  } catch (error) {
    console.error("[Background Job] Error in checkBatchExpiries:", error);
  }
}

/**
 * Runs a full check of all items for low stock.
 */
export async function checkLowStockLevels() {
  console.log("[Background Job] Starting full low stock check...");
  try {
    const items = await Item.find({ isDeleted: false, isActive: true });
    for (const item of items) {
      await checkLowStockAndCreateAlert(item._id);
    }
    console.log("[Background Job] Finished full low stock check.");
  } catch (error) {
    console.error("[Background Job] Error in checkLowStockLevels:", error);
  }
}
