// Publication dates follow the existing UTC schedule across all public routes.
export function getPublicationDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
