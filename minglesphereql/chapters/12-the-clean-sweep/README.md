# Chapter 12: The Clean Sweep

## Story

It was bound to happen. After months of growth, MingleSphereQL received its first account deletion request. Elena, a long-time user, decided to leave the platform. "I want my data gone," she wrote in the support ticket. "Completely gone." The engineering team stared at the request with a mix of dread and determination. Deleting a user is not as simple as removing a row -- there are posts, comments, friend requests, messages, and notifications all tied to that account.

But Elena was not the only case. The moderation team needed to remove spam accounts that had been flooding the platform with bot-generated content. The compliance team needed soft deletes for GDPR -- marking accounts as deleted while retaining a minimal record for audit purposes. And the operations team wanted to restore accidentally deleted accounts when users changed their minds within the 30-day grace period.

The lead developer called a meeting. "We need three strategies," she explained, drawing on the whiteboard. "Hard deletes for permanent removal, soft deletes for reversible deactivation, and cascade awareness so that when a parent record goes, all its children follow." She underlined the word CASCADE twice. "PostgreSQL handles this for us through foreign key constraints, but we need to understand and verify the behavior."

This chapter walks you through the full spectrum of deletion patterns. You will perform hard deletes that permanently remove rows, soft deletes that set a `deletedAt` timestamp, queries that filter out soft-deleted records, cascade delete verification, and restoration of soft-deleted data. These patterns are not just academic exercises -- they are the exact strategies used by production social networks, e-commerce platforms, and SaaS applications worldwide.

Understanding when to use each approach is as important as knowing the syntax. Hard deletes are irreversible but keep the database clean. Soft deletes preserve data for recovery and auditing but add complexity to every query. Cascade deletes maintain referential integrity but can have surprising side effects if you are not careful. By the end of this chapter, you will be equipped to handle all three with confidence.

## Key Concepts

- **Hard Deletes**: Using `db.delete(table).where(condition).returning()` to permanently remove rows.
- **Soft Deletes**: Using `db.update(table).set({ deletedAt: new Date() })` to mark rows as deleted without removing them.
- **Active Record Filtering**: Querying only non-deleted records with `isNull(table.deletedAt)`.
- **CASCADE Behavior**: Understanding how foreign key `onDelete: 'cascade'` automatically removes child rows when a parent is deleted.
- **Data Restoration**: Setting `deletedAt` back to `null` to "undelete" soft-deleted rows.

## Code Examples

### Hard delete
```ts
const deleted = await db
  .delete(schema.users)
  .where(eq(schema.users.id, userId))
  .returning();
```

### Soft delete
```ts
const softDeleted = await db
  .update(schema.users)
  .set({ deletedAt: new Date() })
  .where(eq(schema.users.id, userId))
  .returning();
```

### Find active users
```ts
const activeUsers = await db
  .select()
  .from(schema.users)
  .where(isNull(schema.users.deletedAt));
```

### Restore soft-deleted user
```ts
const restored = await db
  .update(schema.users)
  .set({ deletedAt: null })
  .where(eq(schema.users.id, userId))
  .returning();
```

## What You Will Practice

1. Permanently deleting a user and confirming removal from the database.
2. Soft deleting a user by setting the `deletedAt` timestamp.
3. Querying only active users by filtering out soft-deleted records.
4. Verifying that CASCADE foreign keys automatically clean up related posts.
5. Restoring soft-deleted users by clearing the `deletedAt` field.

## Tips

- Always use `.returning()` with delete operations if you need to confirm what was removed or log the deleted data.
- When implementing soft deletes, remember that every query in your application needs a `WHERE deleted_at IS NULL` filter. Consider creating a reusable helper or database view.
- CASCADE deletes are powerful but can be dangerous -- one misplaced DELETE can wipe out an entire graph of related data. Always test in a safe environment first.
- For GDPR compliance, soft deletes alone may not be sufficient. You may need to anonymize personally identifiable information while keeping the structural record.
- The `db.delete()` method in Drizzle returns the count of deleted rows when not using `.returning()`. Use `.returning()` to get the actual deleted data.
