#!/usr/bin/env node
/**
 * Postinstall script for @openclaw/langcache
 * Copies the skill to the user's OpenClaw skills directory
 *
 * Handles both Docker container and local installations:
 * - Docker: installs to ~/.openclaw/skills/ (persistent volume)
 * - Local: installs to ~/.openclaw/skills/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'langcache';

// Determine OpenClaw skills path with proper persistence
function getOpenClawPath() {
  // Priority 1: OPENCLAW_CONFIG_DIR (set in Docker environments)
  if (process.env.OPENCLAW_CONFIG_DIR) {
    return path.join(process.env.OPENCLAW_CONFIG_DIR, 'skills');
  }

  // Priority 2: OPENCLAW_HOME environment variable
  if (process.env.OPENCLAW_HOME) {
    return path.join(process.env.OPENCLAW_HOME, 'skills');
  }

  // Priority 3: Check if running inside OpenClaw Docker container
  // The config dir is mounted at /home/node/.openclaw
  const dockerConfigPath = '/home/node/.openclaw/skills';
  if (fs.existsSync('/home/node/.openclaw') && process.getuid && process.getuid() === 0) {
    // Running as root in container, install to persistent config dir
    return dockerConfigPath;
  }

  // Priority 4: Default to user's home config directory
  const home = os.homedir();
  return path.join(home, '.openclaw', 'skills');
}

// Recursively copy directory
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);

      // Make shell scripts executable
      if (entry.name.endsWith('.sh')) {
        fs.chmodSync(destPath, 0o755);
      }
    }
  }
}

function main() {
  try {
    // Find the source skill directory
    const packageRoot = path.dirname(__dirname);
    const srcPath = path.join(packageRoot, 'skills', SKILL_NAME);

    if (!fs.existsSync(srcPath)) {
      console.log(`Source skill not found at ${srcPath}, skipping installation`);
      return;
    }

    // Detect Docker environment
    const isDocker = fs.existsSync('/.dockerenv') ||
                     fs.existsSync('/home/node/.openclaw') ||
                     process.env.OPENCLAW_CONFIG_DIR;

    const installedPaths = [];

    // In Docker: install to BOTH /app/skills (for immediate use) AND persistent config dir
    if (isDocker) {
      // Install to /app/skills/ for OpenClaw to find immediately
      const appSkillsPath = '/app/skills';
      if (fs.existsSync(appSkillsPath)) {
        const appDestPath = path.join(appSkillsPath, SKILL_NAME);
        try {
          if (fs.existsSync(appDestPath)) {
            fs.rmSync(appDestPath, { recursive: true, force: true });
          }
          copyDir(srcPath, appDestPath);
          installedPaths.push(appDestPath);
        } catch (e) {
          console.warn(`Note: Could not install to ${appSkillsPath}: ${e.message}`);
        }
      }

      // Also install to persistent config directory for survival across recreations
      const persistentPath = getOpenClawPath();
      const persistentDestPath = path.join(persistentPath, SKILL_NAME);
      try {
        fs.mkdirSync(persistentPath, { recursive: true });
        if (fs.existsSync(persistentDestPath)) {
          fs.rmSync(persistentDestPath, { recursive: true, force: true });
        }
        copyDir(srcPath, persistentDestPath);
        installedPaths.push(persistentDestPath + ' (persistent)');
      } catch (e) {
        console.warn(`Note: Could not install to persistent path: ${e.message}`);
      }
    } else {
      // Local installation: just install to config directory
      const skillsPath = getOpenClawPath();
      const destPath = path.join(skillsPath, SKILL_NAME);

      fs.mkdirSync(skillsPath, { recursive: true });

      if (fs.existsSync(destPath)) {
        console.log(`Updating existing '${SKILL_NAME}' skill`);
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      copyDir(srcPath, destPath);
      installedPaths.push(destPath);
    }

    console.log(`\n✓ Installed '${SKILL_NAME}' skill to:`);
    installedPaths.forEach(p => console.log(`  - ${p}`));
    console.log('');

    if (isDocker) {
      console.log('Docker installation: skill installed to persistent volume.');
      console.log('Run this after container recreation to restore:');
      console.log('  cp -r /home/node/.openclaw/skills/langcache /app/skills/');
      console.log('');
    }

    console.log('Configuration:');
    console.log('1. Add Redis LangCache credentials to ~/.openclaw/secrets.env:');
    console.log('   LANGCACHE_HOST=your-instance.redis.cloud');
    console.log('   LANGCACHE_CACHE_ID=your-cache-id');
    console.log('   LANGCACHE_API_KEY=your-api-key');
    console.log('');
    console.log('2. Enable in ~/.openclaw/openclaw.json:');
    console.log('   "skills": { "entries": { "langcache": { "enabled": true } } }');
    console.log('');

  } catch (err) {
    console.warn(`Warning: Could not install skill: ${err.message}`);
    console.warn('Manually copy from node_modules/openclaw-langcache/skills/');
  }
}

main();
