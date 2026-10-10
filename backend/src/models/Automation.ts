import { Schema, model, Document, Types } from "mongoose";

export interface IStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface IAutomation extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  description: string;
  enabled: boolean;
  trigger: { type: string; config: Record<string, unknown> };
  steps: IStep[];
  webhookKey: string;
  templateKey?: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const stepSchema = new Schema<IStep>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const automationSchema = new Schema<IAutomation>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 300 },
    enabled: { type: Boolean, default: false },
    trigger: {
      type: { type: String, required: true },
      config: { type: Schema.Types.Mixed, default: {} },
    },
    steps: { type: [stepSchema], default: [] },
    webhookKey: { type: String, required: true, unique: true },
    templateKey: String,
    nextRunAt: Date,
    lastRunAt: Date,
    runCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "autoflow_automations", minimize: false }
);
automationSchema.index({ owner: 1, "trigger.type": 1, enabled: 1 });
automationSchema.index({ enabled: 1, nextRunAt: 1 });

export const Automation = model<IAutomation>("Automation", automationSchema);
