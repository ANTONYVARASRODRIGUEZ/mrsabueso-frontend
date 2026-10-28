/** Reemplaza {variables} en una plantilla; las que no existen se dejan tal cual. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
