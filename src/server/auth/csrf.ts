import { headers } from 'next/headers';

export async function verifyOrigin(): Promise<boolean> {
  const headerList = await headers();
  const origin = headerList.get('origin');
  const host = headerList.get('host');

  // If no origin header is provided (e.g. some internal or curl requests), accept or verify host
  if (!origin || !host) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
