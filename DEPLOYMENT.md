# Vision-X Deployment Guide

Your project is containerized and ready for production deployment. This guide covers local testing and deployment to major platforms.

## Quick Start (Local Docker)

### 1. Prepare Environment
```bash
# Copy the example and fill in your secrets
cp .env.production.example .env.production

# Edit with your values
nano .env.production  # or open in your editor
```

**Required values:**
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD` - Admin account password
- `ADMIN_JWT_SECRET` - Min 32 random characters (use `openssl rand -base64 32`)
- `TEAM_JWT_SECRET` - Min 32 random characters

### 2. Start with Docker Compose
```bash
# Build and run
docker compose up --pull always -d

# View logs
docker compose logs -f vision-x

# Verify health
docker ps  # should show "vision-x" container running and healthy

# Access the app
# http://localhost:30001
```

### 3. Initial Setup
1. Go to **Admin Login** (`/admin/login`)
2. Email: (your `ADMIN_EMAIL`)
3. Password: (your `ADMIN_PASSWORD`)
4. Navigate to **Admin > Payment Settings**
5. Add UPI ID and upload QR image
6. Test with `/register` → `/payment` flow

### 4. Verify Data Persistence
```bash
# Create a test registration, then stop containers
docker compose down

# Restart - data should still exist
docker compose up -d
docker compose logs vision-x | grep "Migrations completed"
```

---

## Production Deployments

### VPS / Self-Hosted (Docker + systemd)

**Prerequisites:** Docker + Docker Compose installed

**1. Clone and configure:**
```bash
git clone https://github.com/ReddyKrishna-web/Vision-x-main.git
cd Vision-x-main
cp .env.production.example .env.production

# Edit with production secrets
nano .env.production
```

**2. Create systemd service** (`/etc/systemd/system/vision-x.service`):
```ini
[Unit]
Description=Vision-X Hackathon Platform
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/path/to/Vision-x-main
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**3. Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable vision-x
sudo systemctl start vision-x
sudo systemctl logs vision-x -f  # View logs
```

**4. Reverse proxy (Nginx example):**
```nginx
upstream vision_x {
    server 127.0.0.1:30001;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 5M;  # Payment proof screenshots

    location / {
        proxy_pass http://vision_x;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

### Render.com

**1. Create a new Web Service**
- Repository: `https://github.com/ReddyKrishna-web/Vision-x-main.git`
- Build command: Leave empty (uses Dockerfile)
- Start command: Leave empty (uses Dockerfile CMD)
- Plan: Paid (free tier has ephemeral storage; **data will be lost**)

**2. Add environment variables**
- Go to **Environment** tab
- Add all from `.env.production`
- Add `DOCKER_COMPOSE_COMMAND`: (optional)

**3. Add persistent disk**
- Go to **Disk** tab
- Mount path: `/app/data`
- Size: 5GB+ (depends on registration volume)

**4. Deploy**
- Render auto-deploys on git push
- Check **Logs** tab for issues

---

### Railway.app

**1. Connect repository**
- New project → GitHub → Select repo

**2. Add environment variables**
- Go to **Variables** tab
- Add all from `.env.production`

**3. Add volume for persistence**
- Go to **Volumes** tab
- Mount path: `/app/data`
- Size: 5GB+

**4. Configure service**
- In the generated Railway config, confirm port is `30001`

**5. Deploy**
- Railway auto-deploys; view logs in dashboard

---

### Fly.io

**1. Install flyctl and authenticate**
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

**2. Create app**
```bash
fly apps create vision-x-main
```

**3. Set secrets**
```bash
fly secrets set -a vision-x-main \
  ADMIN_EMAIL=your@email.com \
  ADMIN_PASSWORD=your-password \
  ADMIN_JWT_SECRET=your-jwt-secret \
  TEAM_JWT_SECRET=your-team-secret
```

**4. Add persistent volume**
```bash
fly volumes create vision_x_data -s 5 -a vision-x-main
```

**5. Update `fly.toml`**
```toml
[[services]]
ports = [{ handlers = ["http"], port = 80 }]
auto_stop_machines = true
auto_start_machines = true
min_machines_running = 1

[[mounts]]
source = "vision_x_data"
destination = "/app/data"
```

**6. Deploy**
```bash
fly deploy
```

---

### AWS / DigitalOcean App Platform / Heroku (Docker images)

All support custom Docker images. General flow:

1. **Build and push to registry:**
   ```bash
   docker build -t your-registry/vision-x-main:latest .
   docker push your-registry/vision-x-main:latest
   ```

2. **Create app** with image: `your-registry/vision-x-main:latest`

3. **Configure:**
   - Port: `30001`
   - Environment variables: From `.env.production`
   - Storage/volumes: Mount at `/app/data`

4. **Deploy and monitor**

---

## Database & Data Management

### Backup Strategy

**1. Local backup (before each deploy):**
```bash
# Stop containers
docker compose down

# Backup the volume
docker run --rm \
  -v vision-x-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/vision-x-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Restart
docker compose up -d
```

**2. Automated backups (cron job):**
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/Vision-x-main && docker compose exec -T vision-x tar czf /app/data/backup-$(date +\%Y\%m\%d).tar.gz -C /app/data --exclude backup . && aws s3 cp /app/data/backup-*.tar.gz s3://your-bucket/
```

### Restore from Backup
```bash
# Stop app
docker compose down

# Extract backup into volume
docker run --rm \
  -v vision-x-data:/data \
  -v /path/to/backup.tar.gz:/backup.tar.gz \
  alpine tar xzf /backup.tar.gz -C /data

# Restart
docker compose up -d
```

---

## Monitoring & Logs

### Health Check
```bash
# All platforms
curl http://localhost:30001/api/settings  # Should return 200

# Docker Compose
docker compose logs vision-x | tail -20

# Systemd
sudo systemctl logs vision-x -f

# Render/Railway/Fly: Check dashboard Logs tab
```

### Logs Locations

| Platform | Location |
|----------|----------|
| Docker Compose | `docker compose logs -f vision-x` |
| Systemd | `journalctl -u vision-x -f` |
| Render | Dashboard → Logs |
| Railway | Dashboard → Logs |
| Fly.io | `fly logs -a vision-x-main` |

---

## Troubleshooting

### Container won't start
```bash
# Check logs first
docker compose logs vision-x

# Common issues:
# - Missing .env.production → add required env vars
# - Port 30001 in use → change ports in docker-compose.yml
# - Volume permission error → rebuild image
```

### Database locked
```bash
# SQLite issue; restart container (WAL mode handles concurrent access)
docker compose restart vision-x
```

### Disk full (uploads/workbook)
```bash
# Check volume size
docker system df

# For Docker Compose volumes
docker run --rm -it -v vision-x-data:/data alpine df -h /data

# Archive old data if needed
docker compose exec vision-x tar czf /app/data/archive-$(date +%Y%m%d).tar.gz \
  -C /app/data/uploads --exclude '*.tar.gz' .
```

### Registrations not syncing to Excel
```bash
# Check sync status via Admin > Data Sync page
# Or query DB: sqlite3 data/visionx.db "SELECT * FROM excel_sync_jobs LIMIT 5"
# Manually trigger: POST /api/admin/sync with admin JWT
```

---

## Security Checklist

- [ ] Change `ADMIN_PASSWORD` to something strong (20+ chars, mixed case + numbers + symbols)
- [ ] Rotate `ADMIN_JWT_SECRET` and `TEAM_JWT_SECRET` regularly (use `openssl rand -base64 32`)
- [ ] Use HTTPS in production (Let's Encrypt / Certbot on VPS)
- [ ] Restrict `/admin/*` routes by IP if possible (WAF / reverse proxy)
- [ ] Back up `data/visionx.db` and `data/*.xlsx` regularly
- [ ] Monitor logs for failed login attempts
- [ ] Set strong SMTP credentials if email is enabled
- [ ] Do NOT commit `.env.production` or database files to git
- [ ] Review uploaded payment proof screenshots for fraud regularly

---

## Performance Notes

- **Image size:** ~150MB (Node.js 22-alpine + dependencies)
- **Memory:** 256MB+ recommended (512MB safe for 100+ concurrent users)
- **Storage:** ~1GB baseline; grows ~10KB per registration
- **Startup time:** ~5s (DB migrations on first boot only)

No external services required; all data lives in the persistent `/app/data` volume.

---

## Questions?

Refer to the main README.md for architecture details, or check logs for deployment-specific errors.
