import mongoose, { Schema, Document } from "mongoose";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  STORE_KEEPER: "store_keeper",
  PROCUREMENT: "procurement",
  VIEWER: "viewer",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export interface IUserPreferences {
  theme: "dark" | "light";
  language: string;
  timezone: string;
  notifications: {
    lowStock: boolean;
    newPO: boolean;
    transfers: boolean;
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: string;
  warehouseAccess: mongoose.Types.ObjectId[];
  isActive: boolean;
  lastLogin?: Date;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.VIEWER,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    warehouseAccess: [
      {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark",
      },
      language: {
        type: String,
        default: "en",
      },
      timezone: {
        type: String,
        default: "Asia/Kolkata",
      },
      notifications: {
        lowStock: {
          type: Boolean,
          default: true,
        },
        newPO: {
          type: Boolean,
          default: true,
        },
        transfers: {
          type: Boolean,
          default: true,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);
