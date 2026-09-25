export function verifyProfileRelease(manifest, expectedDshVersion) {
  if (manifest?.harness !== expectedDshVersion) {
    throw new Error(`WorkDSH release targets DSH ${manifest?.harness ?? 'unknown'}, but Desktop pins ${expectedDshVersion}`)
  }
  for (const [name, version] of Object.entries(manifest.runtimeOverrides ?? {})) {
    if ((name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')) && version !== expectedDshVersion) {
      throw new Error(`WorkDSH release overrides ${name} to ${version}; expected ${expectedDshVersion}`)
    }
  }
}

export function verifyPackageDshReferences(manifest, expectedDshVersion) {
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if ((name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')) && version !== expectedDshVersion) {
        throw new Error(`${manifest.name ?? 'WorkDSH package'} references ${name}@${version} in ${field}; expected ${expectedDshVersion}`)
      }
    }
  }
}
