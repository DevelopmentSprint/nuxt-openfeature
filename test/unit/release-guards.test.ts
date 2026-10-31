import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const verifier = path.resolve('scripts/release/verify.mjs')
const original = JSON.parse(readFileSync('package.json', 'utf8'))
const directories: string[] = []
// Git hooks export repository selectors; fixtures must not inherit them.
const fixtureEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))

function fixture() {
  const cwd = mkdtempSync(path.join(tmpdir(), 'release-guard-'))
  directories.push(cwd)
  writeFileSync(path.join(cwd, 'package.json'), JSON.stringify(original))
  const git = (...args: string[]) => execFileSync('git', args, { cwd, env: fixtureEnv, stdio: 'pipe' })
  git('init', '--initial-branch=main')
  git('config', 'user.name', 'Release Test')
  git('config', 'user.email', 'test@example.invalid')
  git('add', 'package.json')
  git('commit', '-m', 'fixture')
  git('tag', `v${original.version}`)
  git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  const verify = (mode = 'source', tag = `v${original.version}`) => execFileSync(process.execPath, [verifier, mode], {
    cwd, env: { ...fixtureEnv, RELEASE_TAG: tag }, stdio: 'pipe',
  })
  return { cwd, git, verify }
}
function archiveFixture(extra?: string, symlink = false, packedName = original.name) {
  const context = fixture()
  const paths = ['package.json', 'README.md', 'LICENSE', 'dist/module.mjs', 'dist/module.d.ts', 'dist/types.mjs', 'dist/types.d.ts']
  if (extra) paths.push(extra)
  for (const file of paths) {
    const target = path.join(context.cwd, 'package', file)
    mkdirSync(path.dirname(target), { recursive: true })
    if (symlink && file === extra) symlinkSync('../README.md', target)
    else writeFileSync(target, file === 'package.json' ? JSON.stringify({ ...original, name: packedName }) : 'public fixture')
  }
  mkdirSync(path.join(context.cwd, 'release'))
  execFileSync('tar', ['-czf', 'release/input.tgz', ...paths.map(file => `package/${file}`)], { cwd: context.cwd, stdio: 'pipe' })
  writeFileSync(path.join(context.cwd, 'release/manifest.json'), JSON.stringify([{ name: original.name, version: original.version, filename: 'input.tgz', files: paths.map(path => ({ path })) }]))
  return context
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('release publication guards', () => {
  it('accepts a matching stable tag on main', () => {
    expect(() => fixture().verify()).not.toThrow()
  })
  it('rejects a tag/version mismatch', () => {
    expect(() => fixture().verify('source', 'v999.0.0')).toThrow()
  })
  it('rejects an unexpected package identity', () => {
    const { cwd, verify } = fixture()
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ ...original, name: '@other/package' }))
    expect(() => verify()).toThrow()
  })
  it('rejects a tagged commit outside main', () => {
    const { git, verify } = fixture()
    git('commit', '--allow-empty', '-m', 'unmerged')
    git('tag', '-f', `v${original.version}`)
    expect(() => verify()).toThrow()
  })
  it('rejects a checkout that differs from the release tag', () => {
    const { git, verify } = fixture()
    git('commit', '--allow-empty', '-m', 'later')
    git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    expect(() => verify()).toThrow()
  })
  it('accepts and prepares a valid archive', () => {
    const { cwd, verify } = archiveFixture()
    expect(() => verify('archive')).not.toThrow()
    expect(readFileSync(path.join(cwd, 'release/package.tgz')).length).toBeGreaterThan(0)
  })
  it('rejects symbolic links even under an allowed path', () => {
    expect(() => archiveFixture('dist/link.js', true).verify('archive')).toThrow(/Only regular files/)
  })
  it('checks the identity inside the archive', () => {
    expect(() => archiveFixture(undefined, false, '@other/package').verify('archive')).toThrow(/Unexpected package identity/)
  })
  it('rejects archive entries omitted from the pack manifest', () => {
    const { cwd, verify } = archiveFixture('dist/extra.js')
    const manifestPath = path.join(cwd, 'release/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest[0].files.pop()
    writeFileSync(manifestPath, JSON.stringify(manifest))
    expect(() => verify('archive')).toThrow(/Archive differs from manifest/)
  })
  it.each(['dist/.beads/data.json', 'dist/.env.json', 'dist/doltdb/data.json', 'notes.json'])('rejects private or unexpected archive content: %s', (extra) => {
    const { cwd, verify } = fixture()
    mkdirSync(path.join(cwd, 'release'))
    const paths = ['package.json', 'README.md', 'LICENSE', 'dist/module.mjs', 'dist/module.d.ts', 'dist/types.mjs', 'dist/types.d.ts', extra]
    writeFileSync(path.join(cwd, 'release/manifest.json'), JSON.stringify([{ name: original.name, version: original.version, filename: 'package.tgz', files: paths.map(path => ({ path })) }]))
    expect(() => verify('archive')).toThrow(/Private or unsafe package path|Unexpected package content/)
  })
})
