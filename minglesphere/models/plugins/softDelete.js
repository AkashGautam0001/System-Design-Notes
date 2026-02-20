/**
 * Soft delete plugin for Mongoose schemas.
 * Adds `isDeleted` and `deletedAt` fields plus helper methods.
 *
 * Usage:
 *   import softDelete from './plugins/softDelete.js';
 *   schema.plugin(softDelete);
 */
export default function softDelete(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  });

  // Instance method: soft delete a document
  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // Instance method: restore a soft-deleted document
  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  // Static: find only non-deleted documents
  schema.statics.findActive = function (filter = {}) {
    return this.find({ ...filter, isDeleted: false });
  };

  // Static: find only deleted documents
  schema.statics.findDeleted = function (filter = {}) {
    return this.find({ ...filter, isDeleted: true });
  };

  // Query helper: only active
  schema.query.active = function () {
    return this.where({ isDeleted: false });
  };

  // Query helper: only deleted
  schema.query.deleted = function () {
    return this.where({ isDeleted: true });
  };
}
