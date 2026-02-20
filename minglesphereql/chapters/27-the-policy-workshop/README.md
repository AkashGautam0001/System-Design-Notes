# Chapter 27: The Policy Workshop

## Story

With Row-Level Security enabled across the MingleSphereQL platform, the invisible walls were standing. But walls alone were not enough. The product team had a growing list of access requirements that went far beyond simple "see your own data" isolation.

It started with the content moderation team. "Our moderators need to see all posts," said Marcus, the trust and safety lead, during the Monday standup. "But they should only be able to edit posts that have been flagged. Regular users should only edit their own posts. And nobody -- not even admins -- should be able to see posts that have been soft-deleted through the normal query path." He paused. "Oh, and we also want a public feed where everyone can see posts marked as public, but friends-only posts should only appear to connected users."

The engineering team realized they had graduated from simple RLS to what they internally called "The Policy Workshop" -- a place where nuanced, layered access rules were forged and tested. The naive one-policy-per-table approach would not cut it. They needed to understand how PostgreSQL combines multiple policies, the difference between permissive and restrictive modes, and how database roles interact with RLS to create a complete authorization layer.

PostgreSQL's policy system has an elegant composition model. When multiple **permissive** policies exist on a table for the same command, they are combined with OR logic. If any one of them grants access, the row is visible. This is perfect for scenarios like "show me my own posts OR posts with more than 10 likes." You do not need to cram all the logic into a single policy expression -- you can decompose it into clean, single-responsibility policies.

But what about rules that must always apply, regardless of what permissive policies allow? That is where **restrictive** policies come in. A restrictive policy combines with AND logic against the union of all permissive policies. If you create a restrictive policy that says `deleted_at IS NULL`, then even if a permissive policy would otherwise grant access to a soft-deleted row, the restrictive policy vetoes it. The final access decision is: `(permissive_1 OR permissive_2 OR ...) AND restrictive_1 AND restrictive_2 AND ...`.

This chapter dives deep into the policy composition model. You will create owner-only write policies that let users modify their own content but not anyone else's. You will build permissive policy stacks that combine with OR to create flexible read access. You will add restrictive policies that act as hard constraints no permissive policy can override. You will set up database roles that map to application-level roles like "admin" and "regular user." And you will learn to inspect the full policy landscape using the `pg_policies` system catalog.

By the end, the MingleSphereQL authorization layer will be sophisticated enough to handle real-world access patterns -- the kind that keep data safe while still letting the right people see the right things at the right time.

## Key Concepts

- **Owner-Only Writes**: An UPDATE policy with `USING (author_id = current_setting('app.current_user_id')::int)` ensures users can only modify their own rows. The USING clause on UPDATE filters which existing rows the user can target.
- **Permissive Policies (OR)**: Multiple permissive policies on the same table and command are combined with OR. A row is accessible if any single permissive policy matches. This allows clean decomposition of access rules.
- **Restrictive Policies (AND)**: Created with `AS RESTRICTIVE`, these policies combine with AND against the permissive union. They act as hard constraints that cannot be overridden. Perfect for soft-delete filters and compliance rules.
- **Policy Composition Formula**: `access = (perm_1 OR perm_2 OR ... OR perm_n) AND restr_1 AND restr_2 AND ... AND restr_m`
- **Database Roles**: PostgreSQL roles (`CREATE ROLE`) map to application-level access tiers. Policies can target specific roles using the `TO role_name` clause, and `GRANT` controls which SQL operations each role can perform.
- **Policy Inspection**: The `pg_policies` view exposes the `permissive` column (values: `PERMISSIVE` or `RESTRICTIVE`), the `roles` array, the `cmd` (SELECT, INSERT, UPDATE, DELETE, ALL), and the expression text.

## Code Examples

### Owner-only UPDATE policy
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY posts_select_all ON posts FOR SELECT USING (true);

-- Only the author can update
CREATE POLICY posts_owner_write ON posts
  FOR UPDATE
  USING (author_id = current_setting('app.current_user_id', true)::int);
```

### Permissive policies combining with OR
```sql
-- User sees own posts
CREATE POLICY posts_author_read ON posts
  FOR SELECT
  USING (author_id = current_setting('app.current_user_id', true)::int);

-- User also sees popular posts
CREATE POLICY posts_popular_read ON posts
  FOR SELECT
  USING (likes_count > 10);

-- Result: user sees (own posts) OR (popular posts)
```

### Restrictive policy for soft-delete filtering
```sql
-- Permissive: allow all reads
CREATE POLICY posts_all_read ON posts FOR SELECT USING (true);

-- Restrictive: but NEVER show soft-deleted rows
CREATE POLICY posts_not_deleted ON posts
  AS RESTRICTIVE
  FOR SELECT
  USING (deleted_at IS NULL);

-- Result: (true) AND (deleted_at IS NULL)
```

### Creating and granting database roles
```sql
DO $$ BEGIN CREATE ROLE app_admin; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE app_user;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON posts TO app_admin;
GRANT SELECT, INSERT, UPDATE ON posts TO app_user;
GRANT USAGE ON SCHEMA public TO app_admin, app_user;
```

### Inspecting policies
```sql
SELECT policyname, permissive, roles, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE tablename = 'posts'
ORDER BY policyname;
```

## Common Pitfalls

- **Forgetting the SELECT policy**: If you create an UPDATE policy but no SELECT policy, users cannot see the rows they want to update. PostgreSQL requires a matching SELECT policy for the UPDATE's implicit read.
- **Restrictive without permissive**: A restrictive policy alone does nothing -- there must be at least one permissive policy to form the OR union. If all policies are restrictive, no rows are accessible.
- **UPDATE needs both USING and WITH CHECK**: The USING clause filters which existing rows you can target. The WITH CHECK clause (if provided) validates the new values after the update. If WITH CHECK is omitted, it defaults to the USING expression.
- **Role hierarchy confusion**: A role that is a member of another role inherits its privileges, but RLS policies targeting specific roles use exact matching by default. Use `TO role_name` carefully.
- **Testing as superuser**: Remember that superusers bypass RLS even with FORCE. Always test RLS through a non-superuser role or use `FORCE ROW LEVEL SECURITY` with `set_config` in transactions.

## What You Will Practice

1. Creating an owner-only UPDATE policy that lets users modify only their own posts.
2. Building multiple permissive policies that combine with OR logic for flexible read access.
3. Adding a restrictive policy to enforce hard constraints (soft-delete filtering) across all permissive rules.
4. Setting up database roles with appropriate GRANT permissions for role-based access control.
5. Querying the `pg_policies` catalog to inspect policy details including permissive/restrictive mode, target roles, and expressions.
