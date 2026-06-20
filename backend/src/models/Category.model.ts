import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryAttribute {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "select";
  options?: string[]; // for select type
  required: boolean;
  unit?: string;
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  parent?: mongoose.Types.ObjectId;
  description?: string;
  attributes: ICategoryAttribute[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryAttributeSchema = new Schema<ICategoryAttribute>({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["text", "number", "boolean", "date", "select"],
    required: true,
  },
  options: [{ type: String, trim: true }],
  required: { type: Boolean, default: false },
  unit: { type: String, default: "" },
});

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    attributes: [CategoryAttributeSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-populate parent category if needed or hook to enforce slug
CategorySchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export default mongoose.model<ICategory>("Category", CategorySchema);
