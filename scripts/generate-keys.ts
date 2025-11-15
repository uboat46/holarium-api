import { promises as fs } from 'fs';
import path from 'path';
import { generateKeyPairSync } from 'crypto';

type KeyPair = {
  name: string;
  privateKeyPath: string;
  publicKeyPath: string;
};

const KEY_PAIRS: KeyPair[] = [
  {
    name: 'access',
    privateKeyPath: path.join('keys', 'access-private.pem'),
    publicKeyPath: path.join('keys', 'access-public.pem'),
  },
  {
    name: 'refresh',
    privateKeyPath: path.join('keys', 'refresh-private.pem'),
    publicKeyPath: path.join('keys', 'refresh-public.pem'),
  },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(targetPath: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
}

async function writeKey(filePath: string, contents: string): Promise<void> {
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, contents, { encoding: 'utf8', mode: 0o600 });
}

function createKeyMaterial() {
  return generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  });
}

async function generateKeys(): Promise<void> {
  const force = process.argv.includes('--force');

  for (const pair of KEY_PAIRS) {
    const privateExists = await fileExists(pair.privateKeyPath);
    const publicExists = await fileExists(pair.publicKeyPath);

    if (!force && (privateExists || publicExists)) {
      console.warn(
        `Skipping ${pair.name} keys because files already exist. Use --force to overwrite.`,
      );
      continue;
    }

    const { privateKey, publicKey } = createKeyMaterial();
    await writeKey(pair.privateKeyPath, privateKey);
    await writeKey(pair.publicKeyPath, publicKey);
    console.info(
      `Generated ${pair.name} key pair:\n  - ${pair.privateKeyPath}\n  - ${pair.publicKeyPath}`,
    );
  }
}

generateKeys().catch((error) => {
  console.error('Failed to generate RSA keys', error);
  process.exit(1);
});
