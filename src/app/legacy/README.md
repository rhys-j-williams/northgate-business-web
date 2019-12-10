# legacy/

Code that predates the 2020 restructure (MBZ-620) and was moved here rather than rewritten. It
works. It is excluded from TSLint (`linterOptions.exclude` in tslint.json) because making it pass
codelyzer was a week nobody had.

- `nacha-format.constants.ts` - record layouts for the NACHA parser. Field offsets from the
  2019 Operating Rules. Note the line endings: this file came from a Windows machine in the
  Treasury Ops team and has been CRLF since the first commit. `.gitattributes` says otherwise;
  git does not rewrite existing blobs and nobody has run `git add --renormalize`. Leave it, the
  parser tests read this file's shape and a whitespace change makes the diff unreadable.
- `nacha-parser.service.ts` - the parser. Pure TypeScript, no Angular beyond the decorator.
- `statements/` - the statement list from the 2019 app. Still the only statements UI.
- `audit-log/` - the entitlements audit trail. Reads the same audit events the users screen does,
  older rendering.
- `positive-pay/` - placeholder. Positive pay was descoped in 2020 (MBZ-790) and the route was
  kept so the bookmark does not 404. There is a sentence of copy behind it.
