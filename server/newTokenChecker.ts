/**
 * New Token Checker
 * - Runs every 8 seconds to check if new tokens were added to watchlist
 * - PAUSES during min 59 of current hour (1 minute before hourly refresh)
 * - PAUSES during min 0 of next hour (during hourly refresh)
 * - RESUMES at min 2 of next hour (after hourly refresh completes)
 * - This catches new tokens before they wait for hourly analytics cycle
 * - Purpose: Fetch analytics for newly added tokens immediately (no cache exists yet)
 */

import { getActiveTokens } from "./watchlistManager";
import { scheduleNewTokenRefresh } from "./hourlyRefreshScheduler";

let newTokenCheckerTimer: NodeJS.Timeout | null = null;
const seenTokens = new Set<string>();
const CHECK_INTERVAL = 8000; // 8 seconds

/**
 * Get current GMT minute
 */
function getCurrentGMTMinute(): number {
  return new Date().getUTCMinutes();
}

/**
 * Check if we should be paused (min 59 or min 0)
 */
function shouldPauseCheck(): boolean {
  const minute = getCurrentGMTMinute();
  // Pause at min 59 (before hourly) and min 0 (during hourly)
  return minute === 59 || minute === 0;
}

/**
 * Check for new tokens added to watchlist and trigger immediate analytics fetch
 */
function checkForNewTokens(): void {
  const minute = getCurrentGMTMinute();
  
  // Skip if we're in pause window (min 59 or 0)
  if (shouldPauseCheck()) {
    console.log(`[NewTokenChecker] PAUSED at GMT minute ${minute} (hourly refresh window)`);
    return;
  }
  
  const activeTokens = getActiveTokens();
  let newTokensFound = 0;
  
  for (const tokenKey of activeTokens) {
    if (!seenTokens.has(tokenKey)) {
      seenTokens.add(tokenKey);
      newTokensFound++;
      
      const [chainIdStr, address] = tokenKey.split('-');
      const chainId = Number(chainIdStr);
      
      console.log(`[NewTokenChecker] New token detected: ${tokenKey}`);
      
      // Schedule immediate analytics fetch for this new token
      scheduleNewTokenRefresh(chainId, address);
    }
  }
  
  if (newTokensFound > 0) {
    console.log(`[NewTokenChecker] Found ${newTokensFound} new token(s) - scheduled immediate analytics fetch`);
  }
}

/**
 * Start the new token checker
 * Checks every 8 seconds, with pause windows at min 59 and min 0 GMT
 */
export function startNewTokenChecker(): void {
  console.log("[NewTokenChecker] Starting 8-second new token checker with GMT-aware pausing");
  
  // Initial check
  checkForNewTokens();
  
  // Check every 8 seconds
  newTokenCheckerTimer = setInterval(() => {
    try {
      checkForNewTokens();
    } catch (e) {
      console.error("[NewTokenChecker] Error during check:", e);
    }
  }, CHECK_INTERVAL);
}

/**
 * Stop the checker
 */
export function stopNewTokenChecker(): void {
  if (newTokenCheckerTimer) {
    clearInterval(newTokenCheckerTimer);
    newTokenCheckerTimer = null;
    console.log("[NewTokenChecker] Stopped");
  }
}

/**
 * Get checker status
 */
export function getNewTokenCheckerStatus() {
  const minute = getCurrentGMTMinute();
  return {
    isRunning: newTokenCheckerTimer !== null,
    isPaused: shouldPauseCheck(),
    currentGMTMinute: minute,
    seenTokensCount: seenTokens.size,
    pauseWindows: "min 59 and min 0 GMT (1 minute before and during hourly refresh)",
  };
}
