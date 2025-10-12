# ADR 001: Role-Based Access Control Implementation

## Status
Accepted

## Date
2025-10-12

## Context
The360 platform requires a mechanism to control which pages users can access based on their role within the system. The current user base includes athletes, organization administrators, sponsors, and system administrators, each requiring access to different subsets of functionality.

### Requirements
- One role per user
- Each page declares which roles can view it
- Admin can view all pages
- Enforcement must be authoritative on the server
- UI can hide links for better UX, but server is the source of truth
- Design must be extensible for future features (permissions, org scope, feature flags)

## Decision

### Core Architecture
We implemented a **centralized, data-driven role-based access control (RBAC)** system with the following components:

#### 1. **Data Model**
- Added `role` field to the `users` table with default value of `"athlete"`
- Four supported roles: `athlete`, `org_admin`, `sponsor`, `admin`
- Role is stored as a varchar field for easy extensibility

#### 2. **Policy Registry** (`shared/access-control.ts`)
A single source of truth that defines:
- Role enumeration and types
- Page identifiers
- Path-to-page mappings
- **Role-to-pages policy** using Set data structures for O(1) lookup
- Helper functions: `canAccess()`, `getAccessiblePages()`, `getAccessiblePaths()`
- Page metadata for future UI enhancements

#### 3. **Server Enforcement** (`server/access-control-middleware.ts`)
- `requirePageAccess(pagePathOrId)`: Middleware to protect routes based on page access
- `requireRole(allowedRoles)`: Middleware to restrict access by specific roles
- `getUserRole()`: Helper to retrieve authenticated user's role
- Returns 401 for unauthenticated users
- Returns 403 for authenticated users without access

#### 4. **UI Helpers** (`client/src/hooks/useAccessControl.ts`)
- `useAccessControl()` hook provides:
  - `hasAccess(pageIdOrPath)`: Check if user can access a page
  - `accessiblePages` / `accessiblePaths`: Lists of accessible resources
  - Role boolean flags: `isAdmin`, `isOrgAdmin`, `isSponsor`, `isAthlete`
- Sidebar component filters navigation items based on access

#### 5. **User Registration**
- Role selection added to registration form with validation
- Three selectable roles: Athlete, Organization Admin, Sponsor
- **Security hardening**: Server validates role against allowlist `[athlete, org_admin, sponsor]`
- Admin role can only be assigned via database/system operations (prevents privilege escalation)
- Invalid or privileged role attempts default to "athlete" and are logged for monitoring
- Role defaults to "athlete" if not specified

## Role-to-Pages Mapping

| Role | Accessible Pages |
|------|-----------------|
| **Athlete** | Dashboard, Athlete360, Career Journey, Opponent Analysis, Training Plan, Rank Up, Draw Sheet, AI Insights, Live Match, Account Settings |
| **Org Admin** | Dashboard, Athlete Directory, Athlete360, Career Journey, Training Plan, Rank Up, Draw Sheet, AI Insights, Sponsorship Hub, Live Match, Account Settings, Data Scraper, Competition Preferences |
| **Sponsor** | Dashboard, Athlete Directory, Athlete360, Career Journey, Sponsorship Hub, AI Insights, Account Settings |
| **Admin** | All pages (full access) |

## Rationale

### Why This Approach?

1. **Centralized Policy Management**
   - Single source of truth in `shared/access-control.ts`
   - Product team can update access policies without code changes (by editing the policy registry)
   - Changes automatically propagate to both client and server

2. **Type Safety**
   - TypeScript enums and types ensure compile-time safety
   - Impossible to reference non-existent roles or pages
   - IDE autocomplete support

3. **Performance**
   - Set-based lookups provide O(1) access checks
   - No database queries needed for access verification after initial user load
   - Minimal overhead on request processing

4. **Extensibility**
   - Policy shape is forward-compatible:
     - Current: `requiredRoles` per page
     - Future: Can add `requiredPermissions` without breaking changes
     - Future: Can introduce role→permissions mapping layer
   - Function signatures remain stable: `canAccess(userRole, pageIdOrPath)`

5. **Security**
   - Server-side enforcement is authoritative
   - UI helpers are for UX only (hiding inaccessible links)
   - Clear separation of concerns
   - Proper HTTP status codes (401 vs 403)

### Why Not Alternatives?

**Rejected: Attribute-Based Access Control (ABAC)**
- Too complex for current needs
- Would require policy evaluation engine
- Overkill for simple role-based requirements

**Rejected: Hard-coded Route Guards**
- Scattered across codebase
- Difficult to maintain and audit
- No single source of truth
- Poor extensibility

**Rejected: Database-Driven Permissions**
- Adds latency to every request
- Unnecessary complexity for static role mappings
- Would cache anyway, defeating the purpose

## Evolution Path

### Phase 2: Granular Permissions (Future)
```typescript
// Add without breaking existing code
export const RolePermissions: Record<UserRole, Set<Permission>> = {
  [UserRole.ATHLETE]: new Set([Permission.VIEW_OWN_DATA, ...]),
  ...
}

// canAccess can evolve to:
function canAccess(user: User, resource: PageId | Resource): boolean {
  // Check role-based page access (current)
  // OR check permission-based resource access (future)
}
```

### Phase 3: Organization Scoping (Future)
```typescript
// Add org context without changing function signatures
function canAccess(
  user: User, 
  resource: PageId | Resource,
  context?: { orgId?: string }
): boolean {
  // Role check + org scope check
}
```

### Phase 4: Feature Flags (Future)
```typescript
// Layer on top of existing system
function canAccess(...args): boolean {
  const hasRoleAccess = /* current logic */;
  const hasFeatureAccess = checkFeatureFlag(...);
  return hasRoleAccess && hasFeatureAccess;
}
```

## Testing Strategy

### Unit Tests (Recommended)
```typescript
describe('canAccess', () => {
  it('admin has access to all pages', () => {
    expect(canAccess('admin', PageId.DASHBOARD)).toBe(true);
    expect(canAccess('admin', '/data-scraper')).toBe(true);
  });

  it('athlete cannot access org admin pages', () => {
    expect(canAccess('athlete', PageId.DATA_SCRAPER)).toBe(false);
    expect(canAccess('athlete', '/athletes')).toBe(false);
  });

  it('sponsor can access sponsorship hub', () => {
    expect(canAccess('sponsor', PageId.SPONSORSHIP_HUB)).toBe(true);
  });
});
```

### Integration Tests (Recommended)
- Test middleware returns 403 for unauthorized access
- Test UI hides inaccessible links
- Test registration sets correct default role

## Consequences

### Positive
- ✅ Clear, maintainable access control
- ✅ Single source of truth for policies
- ✅ Type-safe implementation
- ✅ Easy to audit (see all policies in one file)
- ✅ UI automatically updates when policies change
- ✅ Room to evolve without breaking changes

### Negative
- ⚠️ Requires updating policy registry for new pages (intentional - ensures explicit access control)
- ⚠️ Page IDs must be kept in sync with routes (mitigated by TypeScript)
- ⚠️ Role changes require re-login to take effect (session-based)

### Neutral
- 📝 Product team needs to understand the policy registry structure
- 📝 New developers must add pages to the policy registry
- 📝 Future permissions system will require policy migration (planned)

## References
- Requirements: `attached_assets/Pasted-Implement-simple-role-gated-page-access...txt`
- Policy Registry: `shared/access-control.ts`
- Server Middleware: `server/access-control-middleware.ts`
- UI Hook: `client/src/hooks/useAccessControl.ts`
- Schema Changes: `shared/schema.ts` (users table)

## Notes
- Admin role is not selectable during registration (security measure)
- Server is authoritative; UI helpers are for UX only
- Role changes require database update (no self-service yet)
- Future: Consider role change audit log
