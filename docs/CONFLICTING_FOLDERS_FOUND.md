# Conflicting Folders Audit - 2026-02-14

## Scan Summary

**Scan Date**: 2026-02-14 14:25 UTC  
**Scope**: /var/www, /srv, /home, /root (maxdepth 3)  
**Audit by**: Production Deployment Lock Enforcement

---

## ✅ Folders Found

### Legitimate Production Folder (KEEP)
- **Path**: `/var/www/clickanunt`
- **Status**: ✅ **OFFICIAL PRODUCTION SOURCE**
- **Contains**:
  - `.git` directory with full history ✅
  - `package.json` with clickanunt app ✅
  - `.next` build artifacts ✅
  - `node_modules` ✅
- **PM2 Config**: 
  - App name: `clickanunt`
  - exec_cwd: `/var/www/clickanunt`
  - Status: online (PID 66746)
- **Action**: **DO NOT REMOVE** - This is the production source of truth

---

## ⚠️ Other Folders Found

### Potential Conflicts Scan Results
```
Package.json locations found:
- /var/www/clickanunt (PRODUCTION - KEEP)
- /var/www/clickanunt/.next (sub-folder, ignore)

.next directories found:
- /var/www/clickanunt/.next (PRODUCTION - KEEP)

Named folders (clickanunt, auto-platform, frontend, nextjs):
- /var/www/clickanunt (PRODUCTION - KEEP)

PM2 Apps:
- clickanunt (0) - /var/www/clickanunt (PRODUCTION - KEEP)
- No other Node apps found
```

---

## ✅ Conclusion

**NO CONFLICTING FOLDERS DETECTED** ✅

The production server is CLEAN:
- Only 1 package.json found: production app ✅
- Only 1 .next folder found: production app ✅
- Only 1 PM2 app configured: clickanunt ✅
- No duplicate or orphaned app folders ✅
- No conflicting deployments ✅

**Status**: Safe to proceed with final verification

---

## Audit Details

| Check | Result | Details |
|-------|--------|---------|
| Conflicting folders in /var/www | ✅ NONE | Only /var/www/clickanunt |
| Conflicting folders in /srv | ✅ NONE | Directory clean |
| Conflicting folders in /home | ✅ NONE | Directory clean |
| Conflicting folders in /root | ✅ NONE | Directory clean |
| Multiple package.json files | ✅ NONE | Only production app |
| Multiple .next folders | ✅ NONE | Only production build |
| Multiple PM2 apps on same port | ✅ NONE | Only clickanunt |
| Orphaned node_modules | ✅ NONE | All contained in production |

---

## Recommendations

1. **No cleanup needed** - Server is single-deployment clean
2. **No backups needed** - No conflicting folders to remove
3. **Monitor PM2** - Verify only `clickanunt` app runs
4. **Document** - Treat `/var/www/clickanunt` as immutable production root

---

Generated: 2026-02-14T14:25:00Z
