# Stage 10.5 — Firestore Security & Multi-Tenant Isolation Specification

**Platform:** MarineWorld.City
**Version:** 1.0
**Status:** ARCHITECTURE & SECURITY SPECIFICATION

---

## 1. Canonical Hierarchy & Multi-Tenant Boundaries

The canonical Firestore hierarchy is structured as follows:

```
/platforms/{platformId}                        [Public Read, Immutable Server Write]
/sectors/{sectorId}                            [Public Read, Immutable Server Write]
/sectorCities/{sectorCityId}                   [Public Read, Immutable Server Write]

/companies/{companyId}                         [Public Read Profile, Admin/Owner Write]
  ├── /members/{userId}                        [Tenant Members, Admin/Owner Write, Role Protected]
  ├── /nodes/{nodeId}                          [Public/Member Read, Operations Write, Admin Delete]
  ├── /products/{productId}                    [Public/Member Read, Operations Write, Manager Delete]
  ├── /services/{serviceId}                    [Public/Member Read, Operations Write, Manager Delete]
  ├── /connect/{connectId}                     [Sales/Sender Read, Authenticated Create, Sales Update]
  └── /businessTwin/{twinId}                   [Public/Member Read, Admin/Owner Write]

/companyAnalytics/{companyId}/events/{eventId} [Manager Read, Member Append-Only Create, Immutable]
/aiInteractions/{interactionId}               [Owner/Admin Read, Authenticated Member Append-Only]

/companies/{companyId}/inquiries/{inquiryId}   [Company Sales/Member & Requester Read, Auth Create/Update]
  ├── /messages/{messageId}                   [Company Sales/Member & Requester Read, Sender Append-Only]
/companies/{companyId}/notifications/{notifId} [Company Sales/Admin Read/Create, Immutable]
/users/{uid}/inquiries/{inquiryId}             [Requester Read/Create, Private]
/users/{uid}/notifications/{notifId}           [Requester Read/Create, Private]
```

Primary Tenant Isolation Boundary: **`companyId`** & **`requesterId`**.

---

## 2. Role Hierarchy & Access Matrix

| Role | Company Profile | Members | Nodes | Products & Services | Connect | Inquiries & RFQs | Notifications |
|---|---|---|---|---|---|---|---|
| **OWNER** | Create/Update/Delete | Full Admin + Delete Owner | Create/Update/Delete | Create/Update/Delete | Read/Write/Delete | Read/Write/Close | Read/Write |
| **ADMIN** | Create/Update | Full Admin (except Owner) | Create/Update/Delete | Create/Update/Delete | Read/Write/Delete | Read/Write/Assign | Read/Write |
| **MANAGER** | Read | Read | Create/Update | Create/Update/Delete | Read/Write | Read/Write/Assign | Read/Write |
| **OPERATIONS** | Read | Read | Create/Update | Create/Update | Read | Read/Reply | Read |
| **SALES** | Read | Read | Read | Read | Read/Write | Read/Write/Reply/Offer | Read/Write |
| **MEMBER** | Read | Read | Read | Read | Create | Read/Reply | Read |
| **BUYER / REQUESTER** | Read Profile | None | Read Public | Read Public | Create | Read Own / Create / Reply | Read Own |

---

## 3. Dirty Dozen Payloads & Security Matrix (Tests 01 - 25)

1. **TEST 01:** Unauthenticated user reads public company profile (`/companies/comp-001`) -> **ALLOW** (Public identity read).
2. **TEST 02:** Unauthenticated user writes company profile (`/companies/comp-001`) -> **DENY**.
3. **TEST 03:** Company A member reads Company B private node (`/companies/comp-002/nodes/node-priv`) -> **DENY** (Tenant Isolation).
4. **TEST 04:** Company A member writes Company B product (`/companies/comp-002/products/prod-01`) -> **DENY** (Cross-tenant mutation).
5. **TEST 05:** Company A ADMIN updates Company A product -> **ALLOW**.
6. **TEST 06:** Company A MANAGER updates Company A product -> **ALLOW**.
7. **TEST 07:** Company A MEMBER attempts to promote own role to ADMIN -> **DENY** (Self-escalation prohibited).
8. **TEST 08:** Company A member assigns themselves OWNER -> **DENY** (Owner creation restricted to existing OWNER).
9. **TEST 09:** Company A SALES user creates legitimate Connect record -> **ALLOW**.
10. **TEST 10:** Company A SALES user creates Connect record forging sender as Company B -> **DENY** (`fromUserId` mismatch).
11. **TEST 11:** Company A member reads Company B AI interaction -> **DENY** (Tenant Isolation).
12. **TEST 12:** Unauthenticated user reads AI interaction -> **DENY**.
13. **TEST 13:** Unauthenticated user writes platform registry -> **DENY**.
14. **TEST 14:** Authenticated non-admin writes sector registry -> **DENY**.
15. **TEST 15:** Company OWNER updates Company A profile -> **ALLOW**.
16. **TEST 16:** Company ADMIN deletes Company A member -> **ALLOW** (Subject to Owner protection).
17. **TEST 17:** Company ADMIN deletes target OWNER -> **DENY** (Owner protection).
18. **TEST 18:** User attempts to mutate member `companyId` -> **DENY** (Immutable key).
19. **TEST 19:** User attempts to mutate product `companyId` -> **DENY** (Immutable key).
20. **TEST 20:** User attempts to mutate node `companyId` -> **DENY** (Immutable key).
21. **TEST 21:** Requester reads own Inquiry (`/companies/comp-001/inquiries/inq-001` where `requesterId == uid`) -> **ALLOW**.
22. **TEST 22:** Unrelated user attempts to read Requester's Inquiry -> **DENY** (Tenant & Requester Isolation).
23. **TEST 23:** Requester appends message with forged `senderId` (`senderId != auth.uid`) -> **DENY** (Sender Identity Integrity).
24. **TEST 24:** Company Sales rep appends message to tenant inquiry -> **ALLOW**.
25. **TEST 25:** Requester attempts to delete official offer request -> **DENY** (Immutable Commercial Offer).

---

## 4. Immutable Data Invariants

1. `companyId` on all tenant subcollections must match the parent document path.
2. Canonical entity `id`, `platformId`, and `sectorId` cannot be mutated after creation.
3. `fromUserId` on Connect records must match `request.auth.uid`.
4. `requesterId` on Canonical Inquiries cannot be mutated after creation.
5. Inquiries messages `senderId` must strictly equal `request.auth.uid`.
6. Telemetry events (`companyAnalytics`) are append-only and cannot be modified.
7. Commercial notifications are append-only audit events.
8. AI Interaction logs are append-only and cannot be modified or deleted.
