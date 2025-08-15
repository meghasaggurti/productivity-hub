# Productivity Hub (Web + Firebase) — README

A fully dynamic, collaborative workspace hub that integrates Google tools (Sheets, Calendar, Tasks, Docs, Keep) with nested pages, blocks (text, image, table, kanban, chart, gantt), real-time collaboration, and granular permissions.

## Features (MVP)
- Workspaces with nested pages, soft delete, reorder.
- Collapsible/resizable sidebar + (next) context-aware top navigation.
- Roles: owner/editor/viewer; sharing via invites (email).
- Block system (Text/Image/Table/Kanban) with drag, reorder (Yjs real-time in v2).
- Google integrations (v1: Sheets 2-way sync; v2: Calendar/Tasks; v3: Docs/Keep).
- Firebase Auth (Google); Firestore (real-time) + Storage for uploads.

## Tech Stack
- **Web:** Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, Framer Motion
- **State/Collab:** Firestore realtime; (optional) Yjs
- **Backend:** Firebase (Auth, Firestore, Storage); Next.js Route Handlers (API)
- **Google:** OAuth2 via Google Identity / googleapis (sheets, calendar, tasks, docs, drive.file)

---

## Prerequisites
- Node.js 20.x, npm 10+
- Firebase project(s) (`dev`, `staging`, `prod` recommended)
- Google Cloud project (can be same) with OAuth consent + OAuth client
- Vercel account (optional) for hosting

---

## 1) Clone & Install
```bash
git clone <your-repo-url> productivity-hub
cd productivity-hub
npm install
```

---

## 2) Firebase Setup
1. **Create a Firebase project** (or 3 envs: dev/staging/prod).
2. In **Project Settings → General**, copy your Web App config:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. Enable **Auth → Sign-in method: Google**.
4. Enable **Firestore** and **Storage**.
5. Deploy/attach rules & indexes (optional via CLI):
   ```bash
   # requires firebase-tools (npm i -g firebase-tools)
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,storage:rules,firestore:indexes
   ```

### Firestore Rules
Rules should enforce membership-based access (owner/editor/viewer) for workspaces, pages, and blocks.

### Storage Rules (v1)
Allow members to read, and only editor/owner to write under `workspaces/{wsId}/...`:
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    match /workspaces/{wsId}/{allPaths=**} {
      function isMember() {
        return exists(/databases/$(database)/documents/workspaceMembers/$(wsId + '_' + uid()));
      }
      function role() {
        return get(/databases/$(database)/documents/workspaceMembers/$(wsId + '_' + uid())).data.role;
      }
      allow read: if isSignedIn() && isMember();
      allow write: if isSignedIn() && isMember() && role() in ['owner','editor'];
      allow create: if request.resource.size < 10 * 1024 * 1024;
    }
    match /{path=**} { allow read, write: if false; }
  }
}
```

---

## 3) Google Cloud OAuth Setup
1. In **Google Cloud Console → APIs & Services**:
   - Create **OAuth consent screen** (External or Internal).
   - **Scopes** (start minimal; add more as needed):
     - `.../auth/drive.file`
     - `.../auth/spreadsheets`
     - (later) `.../auth/calendar`, `.../auth/tasks`, `.../auth/keep`, `.../auth/documents`
   - Create **OAuth 2.0 Client ID** (Web Application).
     - Authorized redirect URI: `https://<your-domain>/api/google/callback` (and `http://localhost:3000/api/google/callback` for local dev).
2. Save credentials into `.env.local`.

---

## 4) Environment Variables
Create `.env.local` in the project root:

```bash
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Google OAuth (server)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Token encryption (server)
ENCRYPTION_SECRET=<generate-a-32-byte-hex-or-base64-secret>
```

> Use a unique `ENCRYPTION_SECRET` in each environment. For production, rotate secrets via your hosting provider (e.g., Vercel).

---

## 5) Run Locally
```bash
npm run dev
# open http://localhost:3000
```

---

## 6) Project Structure (key paths)
```
src/
  app/
    layout.tsx                # Root layout (providers)
    page.tsx                  # Landing/bootstrap
    w/[wsId]/p/[pageId]/page.tsx  # Workspace page route
    trash/page.tsx            # Trash
    globals.css               # Tailwind styles
  components/
    Sidebar.tsx               # Workspace/page tree, collapsible + resizable
    BlocksCanvas.tsx          # Block renderer (Text/Image/Table/Kanban)
    AuthProvider.tsx          # Auth context + hooks
    LoginButton.tsx           # Google sign-in
    LogoutButton.tsx          # Sign-out
    # (soon) WorkspaceNav.tsx  # Top navigation with dropdowns
    # (soon) ShareWorkspaceDialog.tsx # Invite & roles
  hooks/
    useResizableSidebar.ts    # Persisted width/collapse; drag to resize
  lib/
    firebaseApp.ts            # Firebase app init
    firebaseAuthClient.ts     # Firebase Auth client
    firebaseDb.ts             # Firestore client
    ops.ts                    # Firestore CRUD helpers
    # (soon) crypto.ts         # AES-GCM encrypt/decrypt helper for tokens
  types/
    db.ts                     # Firestore document types
public/
  # static assets
```

---

## 7) Development Tasks (suggested order)
1. **Top Navigation** (`WorkspaceNav.tsx`) using page tree.
2. **Share & Roles UI** (invites by email → workspaceMembers).
3. **Blocks v1**: Text (simple), Image, Table, Kanban + drag/reorder.
4. **Google OAuth**: `/api/google/connect` + `/api/google/callback`, encrypt tokens.
5. **Sheets Sync (2-way)**: `syncLinks` → push/pull + “Sync now” button.
6. **Presence**: avatars/cursors (Yjs or basic online indicator).
7. **Templates & Onboarding**: seed wedding/student/family templates.
8. **Testing**: unit (utils), integration (sync), E2E (Playwright).

---

## 8) Security Notes
- Store Google OAuth tokens **server-side only**; encrypt at rest.
- Never expose tokens to the client; route all Google API calls through Next.js server handlers.
- Enforce Firestore & Storage rules for membership and roles.
- Add rate limiting & debouncing to sync endpoints.

---

## 9) Scripts
```bash
npm run dev        # local dev
npm run build      # production build
npm run start      # run prod locally
npm run lint       # lint
```

---

## 10) License
Choose a license that matches your goals. MIT is a good default for open-source.

