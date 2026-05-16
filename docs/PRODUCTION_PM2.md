# PM2 production (current infra)

Single fork on VPS — **do not enable cluster** until staging load tests pass.

## Validate before reload

```bash
node scripts/production/validate-ecosystem.mjs
```

## Safe reload (on VPS in `/var/www/clickanunt`)

```bash
./scripts/production/pm2-reload-safe.sh
```

## Log rotation (recommended once on VPS)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

## Rollback

```bash
./scripts/rollback.sh <previous-commit>
```
