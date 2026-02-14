export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

/**
 * GET /api/version
 * 
 * CRITICAL: Returns the actual git commit hash from the production repository.
 * This endpoint MUST NOT be cached and MUST fail if git is not available.
 * 
 * Production MUST run from a git repository.
 * If this returns null or an error, deployment is broken.
 * 
 * Cache Headers:
 * - no-store: Never cached by any CDN or browser
 * - no-cache: Always revalidate
 * - must-revalidate: Cannot use stale response
 */

export async function GET() {
  try {
    // CRITICAL: Get real commit hash from git repository
    // If this fails, production is NOT running from git (deployment ERROR)
    let gitCommit = null;
    let gitError = null;

    try {
      const cwd = process.cwd();
      const gitPath = join(cwd, ".git");

      // FAIL LOUDLY if .git does not exist
      if (!existsSync(gitPath)) {
        gitError = `CRITICAL: .git folder not found at ${gitPath}. Production must run from git repository.`;
        console.error(`❌ ${gitError}`);
      } else {
        // Read actual git commit hash
        try {
          gitCommit = execSync("git rev-parse HEAD", { cwd }).toString().trim();
          console.log(`✅ Git commit resolved: ${gitCommit}`);
        } catch (err) {
          gitError = `CRITICAL: Cannot read git commit. git rev-parse HEAD failed: ${err}`;
          console.error(`❌ ${gitError}`);
        }
      }
    } catch (err) {
      gitError = `CRITICAL: Error checking git repository: ${err}`;
      console.error(`❌ ${gitError}`);
    }

    // If we couldn't get git commit, return ERROR (not null)
    if (!gitCommit) {
      console.error("🚨 PRODUCTION DEPLOYMENT ERROR: Cannot retrieve git commit hash");
      return NextResponse.json(
        {
          error: gitError || "Production not running from git repository",
          status: "error",
          gitCommit: null,
          message:
            "CRITICAL: Production environment is not properly deployed from git. This is a deployment failure.",
        },
        {
          status: 503, // Service Unavailable - deployment is broken
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
    }

    // Read Next.js build ID
    let buildId = "unknown";
    try {
      const buildIdPath = join(process.cwd(), ".next", "BUILD_ID");
      if (existsSync(buildIdPath)) {
        buildId = readFileSync(buildIdPath, "utf-8").trim();
      }
    } catch (err) {
      console.warn("Could not read BUILD_ID");
    }

    // Read package.json version
    let version = "unknown";
    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, "utf-8")
        );
        version = packageJson.version || "unknown";
      }
    } catch (err) {
      console.warn("Could not read version from package.json");
    }

    const response = {
      version,
      buildId,
      gitCommit, // REAL commit hash
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      status: "deployed",
    };

    // Return with STRICT no-cache headers
    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("🚨 CRITICAL VERSION ENDPOINT ERROR:", error);
    return NextResponse.json(
      {
        error: String(error),
        status: "error",
        message: "Version endpoint crashed - deployment may be broken",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}
