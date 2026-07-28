# FAZA 20 — PR section (paste)

## Controlled production deploy (FAZA 20)

- **Verdict:** DEPLOY SUCCESSFUL — MONITORING
- **Deployed:** `c984a8c99d70f4f211507c3c400dd68448968319`
- **Previous:** `a40ccde76d223491098b9f19744d37954ccdac01`
- **Canonical:** `https://www.clickanunt.ro`
- **Migrations:** 5 applied (`priceType`/salary, invoice unique, sessionVersion, refresh tokens, email verification tokens)
- **Backup:** `pre-faza20-20260728T103328Z.dump` — restore verified — retained
- **Uploads:** 1130 files / 310190590 bytes unchanged
- **Release:** `/var/www/clickanunt-releases/20260728T103328Z-c984a8c9`
- **Rollback ready (not activated):** `…/20260728T103328Z-rollback-ed22afed` @ `ed22afed`
- **Residual:** authenticated controlled smoke (20.11) not run (no authorized test credentials); brief 502 during missing `.env.production` symlink (recovered)

Full report: `docs/audits/faza20/REPORT.md`
