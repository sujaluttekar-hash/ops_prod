# How to apply this update

Run these commands from inside your `butler-ops` folder:

```bash
# Stop the dev server first (Ctrl+C), then:
npm run dev
```

That's it — all files are already updated in this download.

## What changed

### New pages
- `/submit`     — Butler task submission form (butler-only, auto-fills name + timestamp)
- `/management` — Admin account management (add/remove butlers, audit log, view all submissions)

### Updated
- All 8 real butlers loaded: Manoj Valmiki, Kalpesh Ther, Kohinoor Shinde, Atish Tandkar, Arbaj Shaikh, Vishal, Vinayak Kharade, Nimish
- Login page: each butler has a quick-login button; passwords are admin123 / butler123
- Sidebar: role-based nav (butler sees Submit task; admin sees Management)
- Submissions persist in localStorage → visible in Management pane immediately

### How submission flow works
1. Butler logs in → sees "Submit task" in sidebar
2. Fills form (task type, property, date, optional photo, notes)
3. Hits Submit → timestamp auto-recorded, saved to localStorage
4. Admin logs in → Management → "Butler task submissions" table shows all entries with butler name, property, date of service, submission timestamp
