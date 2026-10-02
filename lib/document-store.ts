const documentFiles = new Map<string, File>();

export function saveDocumentFile(id: string, file: File): void {
  documentFiles.set(id, file);
}

export function getDocumentFile(id: string): File | null {
  return documentFiles.get(id) ?? null;
}

export function removeDocumentFile(id: string): void {
  documentFiles.delete(id);
}

export function renameDocumentFile(
  oldId: string,
  newId: string
): void {
  const file = documentFiles.get(oldId);

  if (!file) return;

  documentFiles.set(newId, file);
  documentFiles.delete(oldId);
}

export function clearDocumentFiles(): void {
  documentFiles.clear();
}