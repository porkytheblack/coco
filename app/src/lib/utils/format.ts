/**
 * Formats a balance from raw units to human-readable format
 * @param balance - The raw balance as a string (wei, lamports, etc.)
 * @param decimals - The number of decimals for the token
 * @param maxDecimals - Maximum decimal places to display
 */
export function formatBalance(
  balance: string,
  decimals: number = 18,
  maxDecimals: number = 4
): string {
  try {
    const raw = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const whole = raw / divisor;
    const remainder = raw % divisor;

    if (remainder === BigInt(0)) {
      return whole.toString();
    }

    // Convert remainder to string with leading zeros
    const remainderStr = remainder.toString().padStart(decimals, '0');
    // Trim trailing zeros and limit decimals
    const decimalPart = remainderStr.slice(0, maxDecimals).replace(/0+$/, '');

    if (decimalPart === '') {
      return whole.toString();
    }

    return `${whole}.${decimalPart}`;
  } catch {
    return '0';
  }
}

/**
 * Truncates an address for display
 * @param address - The full address
 * @param startChars - Characters to show at start
 * @param endChars - Characters to show at end
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Formats a transaction hash for display
 */
export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) {
    return hash;
  }
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Formats a timestamp to relative time
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Formats duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    const secs = Math.floor(ms / 1000);
    return `${secs}s`;
  } else {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
}

/**
 * Formats gas amount
 */
export function formatGas(gas: number): string {
  if (gas >= 1000000) {
    return `${(gas / 1000000).toFixed(2)}M`;
  } else if (gas >= 1000) {
    return `${(gas / 1000).toFixed(1)}K`;
  }
  return gas.toLocaleString();
}
