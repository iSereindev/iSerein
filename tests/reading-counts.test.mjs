import test from 'node:test';
import assert from 'node:assert/strict';
import { compactCount, countDay, knownCountCrawler, publicCount, readingCountId, secondsUntilCountReset, viewPayload } from '../lib/reading-counts.ts';
import { newViewCookie, readViewToken, viewNetworkHash, viewReaderHash } from '../lib/reading-count-cookie.ts';

test('view requests only accept positive safe reading IDs and never caller-supplied totals', () => {
  assert.equal(readingCountId('12'),12);
  assert.deepEqual(viewPayload({articleId:12}),{articleId:12});
  for(const value of [null,undefined,true,0,-1,1.1,NaN,Infinity,'','01',' 1','1e2','../1',Number.MAX_SAFE_INTEGER+1]) assert.equal(readingCountId(value),null);
  for(const value of [null,[],{}, {articleId:12,views:9000},{articleId:12,count:1},{articleId:-1}]) assert.equal(viewPayload(value),null);
});

test('public totals distinguish a real zero from missing or malformed values', () => {
  assert.equal(publicCount(0),0);
  assert.equal(publicCount('234'),234);
  assert.equal(publicCount(Number.MAX_SAFE_INTEGER),Number.MAX_SAFE_INTEGER);
  for(const value of [null,undefined,'',false,{},[],-1,0.5,NaN,Infinity,'01','1.2','1e3','9007199254740992']) assert.equal(publicCount(value),null);
  assert.equal(compactCount(234),'234');
  assert.equal(compactCount(12345),'12.3K');
});

test('daily counting follows the existing UTC publishing day, including the midnight boundary', () => {
  assert.equal(countDay(new Date('2026-11-08T07:59:59+08:00')),'2026-11-07');
  assert.equal(countDay(new Date('2026-11-08T08:00:00+08:00')),'2026-11-08');
  assert.equal(secondsUntilCountReset(new Date('2026-11-07T23:59:59.999Z')),1);
  assert.equal(secondsUntilCountReset(new Date('2026-11-08T00:00:00Z')),86400);
});

test('daily view cookies reject tampering, arbitrary tokens, different keys and the next day', () => {
  const secret='test-only-secret-not-used-in-production';
  const cookie=newViewCookie(secret,'2026-11-08');
  assert.match(cookie,/^[a-f0-9]{64}\.[a-f0-9]{64}$/);
  assert.equal(readViewToken(cookie,secret,'2026-11-08'),cookie.split('.')[0]);
  assert.equal(readViewToken(cookie,secret,'2026-11-09'),null);
  assert.equal(readViewToken(cookie,'different-key','2026-11-08'),null);
  const changed=cookie.slice(0,-1)+(cookie.endsWith('0')?'1':'0');
  assert.equal(readViewToken(changed,secret,'2026-11-08'),null);
  for(const value of [undefined,'','a'.repeat(64),'a'.repeat(64)+'.'+'b'.repeat(64),cookie+'.extra']) assert.equal(readViewToken(value,secret,'2026-11-08'),null);
});

test('stored reader hashes are scoped to one article and day; network hashes rotate daily', () => {
  const secret='test-secret';
  const token='fictional-browser-token';
  const same=viewReaderHash(secret,'2026-11-08',12,token);
  assert.match(same,/^[a-f0-9]{64}$/);
  assert.equal(same,viewReaderHash(secret,'2026-11-08',12,token));
  assert.notEqual(same,viewReaderHash(secret,'2026-11-08',13,token));
  assert.notEqual(same,viewReaderHash(secret,'2026-11-09',12,token));
  assert.notEqual(same,viewReaderHash(secret,'2026-11-08',12,'other-browser'));
  assert.notEqual(viewNetworkHash(secret,'2026-11-08','203.0.113.5'),viewNetworkHash(secret,'2026-11-09','203.0.113.5'));
});

test('known crawlers and link previews are excluded without excluding normal reading browsers', () => {
  for(const agent of ['Googlebot/2.1','bingbot/2.0','facebookexternalhit/1.1','WhatsApp/2.24','Twitterbot/1.0']) assert.equal(knownCountCrawler(agent),true);
  for(const agent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1','Mozilla/5.0 Chrome/144.0.0.0 Safari/537.36',null]) assert.equal(knownCountCrawler(agent),false);
});
