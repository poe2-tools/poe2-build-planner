import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Copy the pinned tree data + sprite atlases into a destination directory. */
export function copyTree(srcRoot, destRoot) {
  mkdirSync(destRoot, { recursive: true });
  cpSync(join(srcRoot, 'data.json'), join(destRoot, 'data.json'));
  cpSync(join(srcRoot, 'assets'), join(destRoot, 'assets'), { recursive: true });
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  const projectRoot = dirname(dirname(thisFile));
  copyTree(
    join(projectRoot, 'Skill Trees', '0.5.2'),
    join(projectRoot, 'public', 'tree', '0.5.2'),
  );
  console.log('Copied tree data + assets to public/tree/0.5.2/');
}
