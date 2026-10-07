import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// The audit log is a history book: rows are only ever added [AC-ADM-07]
const refuseChange = () => {
  throw new Error("Audit logs are append-only and cannot be changed or deleted");
};

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    targetType: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    before: {
      type: DataTypes.JSON,
    },
    after: {
      type: DataTypes.JSON,
    },
    reason: {
      type: DataTypes.TEXT,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
    },
  },
  {
    tableName: "audit_logs",
    hooks: {
      beforeUpdate: refuseChange,
      beforeBulkUpdate: refuseChange,
      beforeDestroy: refuseChange,
      beforeBulkDestroy: refuseChange,
    },
  },
);

export default AuditLog;
