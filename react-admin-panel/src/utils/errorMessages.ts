export function mapDeleteErrorToFriendlyMessage(entity: 'category' | 'platform', error: any): string {
  const rawMessage: string = error?.message || '';
  const errorCode: string | undefined = error?.code;

  const isForeignKeyViolation =
    errorCode === '23503' ||
    /foreign key/i.test(rawMessage) ||
    /violates foreign key constraint/i.test(rawMessage) ||
    /conflicted with the foreign key constraint/i.test(rawMessage);

  if (isForeignKeyViolation) {
    if (entity === 'category') {
      return 'This category cannot be deleted because it is in use by one or more services. Please remove or reassign those services first, then try again.';
    }
    if (entity === 'platform') {
      return 'This platform cannot be deleted because creators or links are using it. Please remove those references first, then try again.';
    }
  }

  // Fallback to raw error message if available, else a generic one
  return rawMessage || 'Delete failed. Please try again.';
}


