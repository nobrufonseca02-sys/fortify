// Serialização canônica do snapshot de regras (chaves ordenadas, undefined
// omitido). É a base do hash gravado em account_rule_bindings: frontend e
// gateway precisam produzir exatamente a mesma string.

export function canonicalizeSnapshot(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeSnapshot).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalizeSnapshot(record[key])}`)
    .join(',')}}`;
}

/** Assinatura usada só quando o navegador não tem WebCrypto (contexto inseguro). */
export function fnv1a64Signature(input: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
