import { Schema, model, Document, Types } from "mongoose";
import { IStep } from "./Automation";

export type RunStatus = "queued" | "running" | "waiting" | "success" | "stopped" | "failed";

export interface IStepLog {
  stepId: string;
  type: string;
  status: "success" | "stopped" | "failed" | "waiting";
  message: string;
  at: Date;
}

export interface IRun extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  automation: Types.ObjectId;
  automationName: string;
  triggerType: string;
  isTest: boolean;
  status: RunStatus;
  vars: Record<string, unknown>;
  nextStep: number;
  steps: IStep[]; // snapshot, so editing an automation never changes a run in progress
  logs: IStepLog[];
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  resumeAt?: Date; // when a waiting run continues
  claimedAt?: Date; // when a worker picked it up (to recover from crashes)
  createdAt: Date;
}

const runSchema = new Schema<IRun>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    automation: { type: Schema.Types.ObjectId, ref: "Automation", required: true },
    automationName: { type: String, default: "" },
    triggerType: { type: String, required: true },
    isTest: { type: Boolean, default: false },
    status: { type: String, enum: ["queued", "running", "waiting", "success", "stopped", "failed"], default: "queued" },
    vars: { type: Schema.Types.Mixed, default: {} },
    nextStep: { type: Number, default: 0 },
    steps: { type: [{ _id: false, id: String, type: { type: String }, config: Schema.Types.Mixed }], default: [] },
    logs: {
      type: [{ _id: false, stepId: String, type: { type: String }, status: String, message: String, at: Date }],
      default: [],
    },
    error: String,
    startedAt: Date,
    finishedAt: Date,
    resumeAt: Date,
    claimedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "autoflow_runs", minimize: false }
);
runSchema.index({ owner: 1, createdAt: -1 });
runSchema.index({ automation: 1, createdAt: -1 });
runSchema.index({ status: 1, resumeAt: 1 });

export const Run = model<IRun>("Run", runSchema);
