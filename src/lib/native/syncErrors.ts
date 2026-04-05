export function getOfflineNumberConflictMessage(args: {
  error: unknown;
  documentLabel: string;
  numberValue: string;
}): string | null {
  const { error, documentLabel, numberValue } = args;
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "");

  const isConflict =
    code === "23505" ||
    /duplicate key|unique constraint|already exists/i.test(message);

  if (!isConflict) {
    return null;
  }

  return `${documentLabel} number ${numberValue} already exists on the server. Review the device assignment or counter state before retrying sync.`;
}
