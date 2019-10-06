import fs from 'fs-extra';
import cp from 'child_process';

export default function generateThrift(includeDirs, outDir, target, serviceDef) {
  fs.mkdirpSync(outDir);
  cp.spawnSync(
    'thrift',
    ['-I', includeDirs.join(' '), '-r', '-out', outDir, '--gen', target, serviceDef]
  );
}
