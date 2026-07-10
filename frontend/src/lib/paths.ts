export function projectPath(id: string): string {
  return `/project/${id}`;
}

export function shareUrl(id: string): string {
  return `${window.location.origin}${projectPath(id)}`;
}

/** /project/<id> の URL パスから id を取り出す。該当しなければ null。 */
export function parseProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([A-Za-z0-9]+)\/?$/);
  return match ? match[1] : null;
}
