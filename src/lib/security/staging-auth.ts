function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export function parseBasicAuthorization(
  header: string | null
): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString(
      "utf8"
    );
    const separator = decoded.indexOf(":");
    if (separator <= 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isStagingProtected(
  username: string | undefined,
  password: string | undefined
): boolean {
  return Boolean(username && password);
}

export function isStagingAuthorized(
  header: string | null,
  username: string,
  password: string
): boolean {
  const credentials = parseBasicAuthorization(header);
  if (!credentials) return false;

  return (
    constantTimeEqual(credentials.username, username) &&
    constantTimeEqual(credentials.password, password)
  );
}
