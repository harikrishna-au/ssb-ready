# Firebase configuration (template)

This folder holds **templates** you can wire to your Firebase project.

## Security rules

- Copy `firestore.rules` into the Firebase Console → Firestore → Rules, or use the Firebase CLI with `firebase.json` at the repo root pointing here.

## Indexes

- Simple queries like `orderBy('score', 'desc')` on `ppdt_results` / `tat_results` usually work without extra indexes.
- If the console shows an index link in an error message, click **Create index** (recommended).

## Deploy (CLI)

From this repo root (after `firebase login` and `firebase use <project>`):

```bash
firebase deploy --only firestore:rules
```

Optional indexes deploy:

```bash
firebase deploy --only firestore:indexes
```
