import type { CompanyMemberEntity } from "@/lib/types";

/**
 * Stage 1 Correction — Canonical Development Membership Repository
 * Single Source of Truth for Company Memberships in Development Persistence Mode.
 * Replaces duplicate memberRegistry and membershipRegistry maps.
 */

const membershipStore = new Map<string, CompanyMemberEntity>();

function buildMemberKey(companyId: string, userId: string): string {
  return `${companyId.toLowerCase()}:${userId.toLowerCase()}`;
}

// Seed default development memberships with human-facing corporate metadata
const initialMemberships: CompanyMemberEntity[] = [
  {
    userId: "usr-owner-001",
    companyId: "argento-marine",
    role: "OWNER",
    status: "ACTIVE",
    displayName: "Marco Bellini",
    businessEmail: "m.bellini@argentomarine.it",
    jobTitle: "Managing Director & Founder",
    department: "Executive",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    createdAt: "2026-01-15T09:30:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-admin-002",
    companyId: "argento-marine",
    role: "ADMIN",
    status: "ACTIVE",
    displayName: "Elena Rostova",
    businessEmail: "e.rostova@argentomarine.it",
    jobTitle: "Head of Operations",
    department: "Operations",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(), // 1 hr ago
    createdAt: "2026-02-01T11:15:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-comm-003",
    companyId: "argento-marine",
    role: "COMMERCIAL",
    status: "ACTIVE",
    displayName: "David Van Der Bilt",
    businessEmail: "d.vanderbilt@argentomarine.it",
    jobTitle: "Commercial & Procurement Lead",
    department: "Commercial",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    createdAt: "2026-03-10T14:20:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-tech-004",
    companyId: "argento-marine",
    role: "TECHNICAL",
    status: "ACTIVE",
    displayName: "Ing. Matteo Rossi",
    businessEmail: "m.rossi@argentomarine.it",
    jobTitle: "Chief Naval Architect",
    department: "Technical & Engineering",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(), // 2 hrs ago
    createdAt: "2026-03-18T08:45:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-pending-005",
    companyId: "argento-marine",
    role: "COMMERCIAL",
    status: "PENDING",
    displayName: "Sofia Chen",
    businessEmail: "s.chen@pacific-trade.com",
    jobTitle: "APAC Sales Representative",
    department: "Commercial",
    invitedBy: "Marco Bellini",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days remaining
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-member-003",
    companyId: "argento-marine",
    role: "MEMBER",
    status: "ACTIVE",
    displayName: "Lucas Lindqvist",
    businessEmail: "l.lindqvist@argentomarine.it",
    jobTitle: "Quality Assurance Specialist",
    department: "Quality",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    createdAt: "2026-04-05T10:00:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-suspended-member-005",
    companyId: "argento-marine",
    role: "MEMBER",
    status: "SUSPENDED",
    displayName: "Julian Vance",
    businessEmail: "j.vance@former-partner.com",
    jobTitle: "Contractor",
    department: "External",
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: "2026-02-15T09:00:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-multi-owner-003",
    companyId: "crest-group-materials",
    role: "OWNER",
    status: "ACTIVE",
    displayName: "Arthur Pendelton",
    businessEmail: "a.pendelton@crestgroup.com",
    jobTitle: "Executive Chairman",
    department: "Executive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-multi-owner-003",
    companyId: "maritime-association",
    role: "ADMIN",
    status: "ACTIVE",
    displayName: "Arthur Pendelton",
    businessEmail: "a.pendelton@crestgroup.com",
    jobTitle: "Executive Chairman",
    department: "Executive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "usr-ecosystem-admin-004",
    companyId: "port-authority",
    role: "ADMIN",
    status: "ACTIVE",
    displayName: "Helena Vane",
    businessEmail: "h.vane@portauthority.org",
    jobTitle: "Port Operations Director",
    department: "Port Control",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

initialMemberships.forEach((mem) => {
  membershipStore.set(buildMemberKey(mem.companyId, mem.userId), mem);
});

export function saveMember(member: CompanyMemberEntity): CompanyMemberEntity {
  const key = buildMemberKey(member.companyId, member.userId);
  membershipStore.set(key, { ...member });
  return member;
}

export function findMember(companyId: string, userId: string): CompanyMemberEntity | undefined {
  return membershipStore.get(buildMemberKey(companyId, userId));
}

export function findMembersByCompanyId(companyId: string): CompanyMemberEntity[] {
  if (!companyId) return [];
  const normId = companyId.toLowerCase();
  const results: CompanyMemberEntity[] = [];
  for (const [key, mem] of membershipStore.entries()) {
    if (key.startsWith(`${normId}:`)) {
      results.push({ ...mem });
    }
  }
  return results;
}

export function findMembersByUserId(userId: string): CompanyMemberEntity[] {
  if (!userId) return [];
  const normUser = userId.toLowerCase();
  const results: CompanyMemberEntity[] = [];
  for (const [key, mem] of membershipStore.entries()) {
    if (key.endsWith(`:${normUser}`)) {
      results.push({ ...mem });
    }
  }
  return results;
}

export function deleteMember(companyId: string, userId: string): boolean {
  return membershipStore.delete(buildMemberKey(companyId, userId));
}

export function clearMembershipStore(): void {
  membershipStore.clear();
}

export function resetDefaultMemberships(): void {
  membershipStore.clear();
  initialMemberships.forEach((mem) => {
    membershipStore.set(buildMemberKey(mem.companyId, mem.userId), mem);
  });
}
