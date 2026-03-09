# Automatic Deployment Script

This script provides fully automated deployment with Git integration for the ClickAnunț production environment.

## Features

- **Git Integration**: Automatically stages, commits, and pushes changes
- **Pre-deployment Checks**: Runs linting, type checking, and tests
- **Zero-downtime Deployment**: Uses PM2 for seamless restarts
- **Health Verification**: Checks application health after deployment
- **Error Handling**: Comprehensive error handling and rollback capabilities

## Usage

### Via NPM Script (Recommended)
```bash
npm run deploy-auto
```

### Via VS Code Tasks
1. Open Command Palette (`Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Deploy to Production (Auto)"

### Direct Script Execution
```bash
./scripts/deploy-auto.sh
```

## What It Does

1. **Git Operations**:
   - Checks for uncommitted changes
   - Stages all changes (`git add .`)
   - Commits with timestamp message
   - Pushes to remote repository

2. **Pre-deployment Validation**:
   - ESLint checks (max-warnings=0)
   - TypeScript type checking
   - Jest test suite
   - Local build verification

3. **Server Deployment**:
   - Syncs files via rsync (excludes node_modules, .git, etc.)
   - Installs dependencies on server
   - Runs database migrations
   - Builds application on server
   - Restarts PM2 process

4. **Post-deployment**:
   - Health check verification
   - PM2 status check
   - Deployment summary

## Safety Features

- **Confirmation Prompts**: Asks for confirmation before critical operations
- **Error Trapping**: Stops deployment on any failure
- **SSH Testing**: Verifies server connectivity before deployment
- **Backup Awareness**: Notes database backup status

## Configuration

The script uses these environment variables and settings:

- **Server**: `root@46.225.69.155`
- **Deploy Directory**: `/var/www/clickanunt`
- **App Name**: `clickanunt`
- **Git Branch**: `main`

## Requirements

- SSH access to production server
- Git repository with remote origin
- PM2 installed on server
- Node.js and npm on both local and server
- Proper SSH keys configured

## Troubleshooting

### Git Push Fails
- Check if you have push permissions
- Verify remote origin is set correctly
- Check for merge conflicts

### SSH Connection Fails
- Verify SSH keys are configured
- Check server firewall settings
- Ensure server is accessible

### Build Fails
- Run `npm run preflight` locally first
- Check for missing dependencies
- Verify environment variables

### PM2 Restart Fails
- Check PM2 is installed on server
- Verify app name matches PM2 process
- Check server resources

## Manual Override

If automatic deployment fails, use the manual deployment script:
```bash
npm run deploy
```

This provides more control and doesn't include automatic Git operations.