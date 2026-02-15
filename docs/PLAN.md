# Implementation Plan - Trello Sync & Configuration

Implement 2-way synchronization between Trello Cards and Tickets, configurable per Game.

## Proposed Changes

### Backend & Data Types

#### [MODIFY] [src/lib/data-provider/types.ts](file:///c:/Projects/AI/Ticketto/ticket-system/src/lib/data-provider/types.ts)
-   Update `Game` type to include `trelloListMap` (NEW, IN_PROGRESS, DONE).

#### [MODIFY] [src/lib/data-provider/firebase-provider.ts](file:///c:/Projects/AI/Ticketto/ticket-system/src/lib/data-provider/firebase-provider.ts)
-   Update `createGame`/`updateGame` handles.

#### [NEW] [src/app/api/trello/sync/route.ts](file:///c:/Projects/AI/Ticketto/ticket-system/src/app/api/trello/sync/route.ts)
-   Endpoint to sync Ticket Status based on Trello Card List location.

### Frontend - Admin Pages

#### [MODIFY] [src/app/admin/games/page.tsx](file:///c:/Projects/AI/Ticketto/ticket-system/src/app/admin/games/page.tsx)
-   Update Game Modal to input List IDs for statuses.

#### [MODIFY] [src/app/admin/tickets/page.tsx](file:///c:/Projects/AI/Ticketto/ticket-system/src/app/admin/tickets/page.tsx)
-   Add "Sync Trello" button.
-   Implement 10s auto-sync.

## Verification Plan
1.  **Config**: Edit Game > Set List IDs.
2.  **Sync**: Move Card in Trello > Wait 10s > Verify Status Update in Admin.
