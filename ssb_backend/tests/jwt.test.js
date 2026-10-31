/**
 * The edge function (Deno) cannot run under node:test, so this exercises the same jose calls
 * with the same options against a local key set: valid, expired, wrong issuer, bad signature.
 * It proves the verification settings, not the Deno file itself.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

async function setup() {
  const { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } = await import('jose');
  const good = await generateKeyPair('RS256');
  const evil = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(good.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const sign = (key, claims, { iss = 'https://clerk.example.test', exp = '5m' } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setSubject('user_123').setIssuer(iss).setIssuedAt().setExpirationTime(exp).sign(key);
  return { jwks, sign, good, evil, jwtVerify: (await import('jose')).jwtVerify };
}
const ISSUER = 'https://clerk.example.test';

test('Clerk-style token: valid passes; expired, wrong issuer and forged signature fail', async () => {
  const { jwks, sign, good, evil, jwtVerify } = await setup();
  const ok = await jwtVerify(await sign(good.privateKey, {}), jwks, { issuer: ISSUER, clockTolerance: 5 });
  assert.equal(ok.payload.sub, 'user_123');
  await assert.rejects(jwtVerify(await sign(good.privateKey, {}, { exp: Math.floor(Date.now() / 1000) - 3600 }), jwks, { issuer: ISSUER, clockTolerance: 5 }), /exp/);
  await assert.rejects(jwtVerify(await sign(good.privateKey, {}, { iss: 'https://evil.test' }), jwks, { issuer: ISSUER }), /iss/);
  await assert.rejects(jwtVerify(await sign(evil.privateKey, {}), jwks, { issuer: ISSUER }));
  await assert.rejects(jwtVerify('not.a.jwt', jwks, { issuer: ISSUER }));
});
