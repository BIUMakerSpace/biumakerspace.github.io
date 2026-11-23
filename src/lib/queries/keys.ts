// Central query keys so mutations can invalidate exactly what they change.
export const queryKeys = {
  blogPosts: ["blog-posts"] as const,
  blogPost: (slug: string) => ["blog-posts", slug] as const,
  forumQuestions: ["forum-questions"] as const,
  forumThread: (id: string) => ["forum-questions", id] as const,
  catalogItems: ["catalog-items"] as const,
  itemSources: ["item-sources"] as const,
  catalogItemSources: ["catalog-item-sources"] as const,
  filamentColors: (includeInactive: boolean) => ["filament-colors", includeInactive] as const,
  myRequests: (userId: string) => ["my-requests", userId] as const,
  lockersStatus: ["lockers-status"] as const,
  myLocker: (userId: string) => ["my-locker", userId] as const,
  /** Per user, because each meeting's "is_registered" depends on who is signed in. */
  workshops: (userId: string) => ["workshops", userId] as const,
  admin: {
    all: ["admin"] as const,
    printRequests: ["admin", "print-requests"] as const,
    lendRequests: ["admin", "lend-requests"] as const,
    itemRequests: ["admin", "item-requests"] as const,
    users: ["admin", "users"] as const,
    lockers: ["admin", "lockers"] as const,
    emailTemplates: ["admin", "email-templates"] as const,
    wishlist: ["admin", "wishlist"] as const,
    workshopRegistrations: (meetingId: string) => ["admin", "workshop-registrations", meetingId] as const,
  },
};
