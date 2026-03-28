import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name?: string;
  address?: string;
  pincode?: string;
  language?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    address: { type: String },
    pincode: { type: String },
    language: { type: String, default: 'en' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
