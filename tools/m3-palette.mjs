// Prints NeatInk's real Material 3 colours (seed 0xFF2F3C8C) so the rebuilt tablet UI matches the app.
// The colour library ships extensionless ESM that Node can't load, so Vite's SSR loader resolves it.
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true }, ssr: { noExternal: ['@material/material-color-utilities'] } });
const { argbFromHex, hexFromArgb, themeFromSourceColor } = await server.ssrLoadModule('@material/material-color-utilities');
const theme = themeFromSourceColor(argbFromHex('#2F3C8C'));
const pick = ['primary','onPrimary','primaryContainer','onPrimaryContainer','secondaryContainer','onSecondaryContainer','surface','onSurface','onSurfaceVariant','outline','outlineVariant','error'];
for (const mode of ['light', 'dark']) {
  const s = theme.schemes[mode].toJSON();
  console.log(mode, JSON.stringify(Object.fromEntries(pick.map((k) => [k, hexFromArgb(s[k])]))));
}
const n = theme.palettes.neutral;
console.log('neutral', JSON.stringify(Object.fromEntries([4,6,10,12,17,22,24,87,90,92,94,96,98].map((t) => [t, hexFromArgb(n.tone(t))]))));
await server.close();
