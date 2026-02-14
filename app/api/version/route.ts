export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * GET /api/version
 * 
 * Returns deployment version information to verify which version is deployed.
 * This is critical for confirming deployment success and debugging issues.
 * 
 * Cache Headers:
 * - no-store: Always fetch fresh (never cached)
 * - no-cache: Revalidate before use  
 * - must-revalidate: Cannot use stale version
 * 
 * This prevents Cloudflare and browsers from caching deployment info.
 */

export async function GET() {
  try {
    // Read git commit hash from environment or deployment metadata
    let gitCommit =
      process.env.GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT ||
      null;

    // Try to read from deployment metadata file (created by deploy script)
    try {
      const deploymentInfoPath = join(process.cwd(), "deployment-info.json");
      if (existsSync(deploymentInfoPath)) {
        const deploymentInfo = JSON.parse(
          readFileSync(deploymentInfoPath, "utf-8")
        );
        gitCommit = deploymentInfo.gitCommit || gitCommit;
      }
    } catch (err) {
      // Silently fail - deployment-info.json may not exist yet
    }

    // Read Next.js build ID
    let buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
    try {
      const buildIdPath = join(process.cwd(), ".next", "BUILD_ID");
      if (existsSync(buildIdPath)) {
        const nextBuildId = readFileSync(buildIdPath, "utf-8").trim();
        buildId = nextBuildId;
      }
    } catch (err) {
      // Silently fail - BUILD_ID may not be available
    }

    // Read package.json version
    let version = "1.0.0";
    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, "utf-8")
        );
        version = packageJson.version || "1.0.0";
      }
    } catch (err) {
      // Silently fail - package.json should always exist
    }

    const response = {
      version,
      buildId,
      gitCommit,
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
    };

    // Return with strict no-cache headers to prevent caching of version info
    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Version endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve version information",
        status: "error",
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
