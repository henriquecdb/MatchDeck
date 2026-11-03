import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function checkRustAudit(audit, metadata) {
  if (typeof audit.vulnerabilities?.found !== 'boolean') throw new Error('Invalid RustSec report');
  if (audit.vulnerabilities.found) throw new Error('RustSec reported known vulnerabilities');
  const nodes = new Map(metadata.resolve?.nodes?.map(node => [node.id, node]));
  const root = metadata.resolve?.root;
  if (!root || !nodes.has(root)) throw new Error('Missing Windows dependency graph');
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    const node = nodes.get(id);
    if (!node) throw new Error('Incomplete Windows dependency graph');
    visited.add(id);
    for (const dependency of node.deps) visit(dependency.pkg);
  }
  visit(root);
  const packages = new Map(metadata.packages.map(pkg => [pkg.id, pkg]));
  const active = new Set([...visited].map(id => {
    const pkg = packages.get(id);
    if (!pkg) throw new Error('Missing Windows package metadata');
    return `${pkg.name}@${pkg.version}`;
  }));
  const messages = [];
  for (const [kind, warnings] of Object.entries(audit.warnings ?? {})) {
    if (!Array.isArray(warnings)) throw new Error('Invalid RustSec warnings');
    for (const warning of warnings) {
      const { name, version } = warning.package ?? {};
      const id = warning.advisory?.id;
      if (!name || !version || !id) throw new Error('Incomplete RustSec warning');
      const included = active.has(`${name}@${version}`);
      messages.push(`${id}: ${name}@${version} (${kind}) - ${included ? 'active Windows dependency' : 'not in the Windows build'}`);
      if (included && kind === 'unsound') throw new Error(`Unsound Windows dependency: ${id} ${name}@${version}`);
    }
  }
  return messages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [audit, metadata] = process.argv.slice(2).map(path => JSON.parse(readFileSync(path, 'utf8')));
  console.log(checkRustAudit(audit, metadata).join('\n') || 'No RustSec warnings');
}
