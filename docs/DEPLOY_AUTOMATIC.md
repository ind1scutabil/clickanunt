# Automatic GitHub Actions Deployment Guide

This guide explains how to set up fully automatic deployment to your Hetzner server using GitHub Actions.

## 🚀 Overview

When you push code to the `main` branch, GitHub Actions will automatically:
1. Run tests and build checks
2. Deploy to your Hetzner server via SSH
3. Restart the application with PM2
4. Perform health checks

## 📋 Prerequisites

### Server Requirements
- Ubuntu/Debian Linux server
- SSH access with private key authentication
- Node.js 20+ installed
- PM2 installed globally (`npm install -g pm2`)
- Git repository cloned in the application directory

### GitHub Requirements
- Repository with `main` branch as default
- GitHub repository access

## 🔐 GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions

### Required Secrets:

#### 1. `SSH_PRIVATE_KEY`
```
Type: Private key for SSH authentication
How to generate:
  - On your local machine: ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"
  - Copy the PRIVATE key (not public) to this secret
  - Add the PUBLIC key to your server's ~/.ssh/authorized_keys
```

#### 2. `HOST`
```
Type: Server IP address or domain
Example: 46.225.69.155
```

#### 3. `USERNAME`
```
Type: SSH username
Example: root
```

#### 4. `PORT`
```
Type: SSH port
Default: 22
```

#### 5. `APP_DIR`
```
Type: Absolute path to application directory on server
Example: /var/www/clickanunt
```

#### 6. `PM2_APP_NAME`
```
Type: PM2 application name
Example: clickanunt
```

## 🖥️ Server Setup

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

### 2. Setup SSH Keys
```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add GitHub Actions public key to authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Restart SSH service
sudo systemctl restart ssh
```

### 3. Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www/clickanunt
sudo chown $USER:$USER /var/www/clickanunt

# Clone repository
cd /var/www
git clone https://github.com/yourusername/yourrepo.git clickanunt
cd clickanunt

# Install dependencies
npm ci

# Build application
npm run build

# Start with PM2
pm2 start npm --name clickanunt -- start
pm2 save
pm2 startup
```

### 4. Configure Environment
```bash
# Copy environment file
cp .env.example .env.production

# Edit production environment variables
nano .env.production
```

## 🔄 Workflow Details

### Triggers
- **Automatic**: Push to `main` branch
- **Manual**: Via GitHub Actions tab → "Run workflow"

### Steps Performed
1. **Checkout**: Gets latest code
2. **Setup Node.js**: Installs Node.js 20 with npm caching
3. **Install Dependencies**: Runs `npm ci`
4. **Quality Checks**: Linting, type checking, tests
5. **Build**: Production build
6. **SSH Setup**: Configures SSH key and known_hosts
7. **Deploy**: Executes deployment on server
8. **Health Check**: Verifies application is running

### Deployment Process on Server
```bash
cd /var/www/clickanunt
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
pm2 restart clickanunt --update-env
```

## 🛡️ Security Features

### Concurrency Control
- Only one deployment runs at a time
- Previous deployments are not cancelled

### SSH Security
- Uses private key authentication
- Automatically adds server to known_hosts
- Strict host key checking enabled

### Error Handling
- Fails fast on any error
- Comprehensive error messages
- Health check verification

## 📊 Monitoring Deployment

### GitHub Actions
- Go to repository → Actions tab
- View deployment logs in real-time
- See success/failure status

### Server Logs
```bash
# Check PM2 logs
pm2 logs clickanunt

# Check PM2 status
pm2 status

# Monitor application
pm2 monit
```

### Health Check
The workflow automatically checks `https://www.clickanunt.ro/api/health`

## 🚨 Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs for specific errors
2. Verify all secrets are configured correctly
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/id_rsa -p 22 root@46.225.69.155
   ```

### SSH Connection Issues
1. Verify private key is correct (no extra spaces/newlines)
2. Check server firewall allows SSH
3. Ensure public key is in `~/.ssh/authorized_keys`

### Build Fails
1. Check Node.js version on server matches GitHub Actions (20+)
2. Verify environment variables are set
3. Check disk space on server

### PM2 Issues
1. Check PM2 is installed: `pm2 --version`
2. Verify app name matches secret
3. Check PM2 logs: `pm2 logs`

## 🔧 Manual Deployment Override

If automatic deployment fails, you can deploy manually:

```bash
# Local deployment
npm run deploy-auto

# Or direct script
./scripts/deploy-auto.sh
```

## 📝 Environment Variables

Create `.env.production` on server with:
```bash
NODE_ENV=production
NEXT_PUBLIC_BUILD_ID=auto
GIT_COMMIT_SHA=auto
# Add other production variables
```

## 🎯 Best Practices

1. **Test Locally**: Always test changes locally before pushing
2. **Monitor Logs**: Check PM2 logs after deployment
3. **Backup**: Regular database backups
4. **Security**: Keep SSH keys secure, rotate regularly
5. **Monitoring**: Set up alerts for deployment failures

## 📞 Support

If deployment fails:
1. Check GitHub Actions logs
2. Review server logs
3. Test SSH connection
4. Verify secrets configuration

The workflow is designed to be robust and provide detailed error messages for troubleshooting.