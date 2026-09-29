export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (path.includes("expo-sharing") || path.includes("share-into"))
      return "/incoming";
    return path;
  } catch {
    return "/incoming";
  }
}
