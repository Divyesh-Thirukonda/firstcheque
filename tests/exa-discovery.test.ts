import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExaSearch} from '../src/lib/exa-discovery';
test('Exa discovery parses bounded public source leads and leaves undated sources unknown',()=>{
  const hits=parseExaSearch('Title: Digital Handover | Autodesk Tandem\nURL: https://intandem.autodesk.com/digital-handover/\nPublished: 2021-09-01T08:56:42.000Z\nAuthor: N/A\nHighlights:\nA discovery snippet, not retained evidence.\n---\nTitle: Hospital handover\nURL: https://example.org/handover\nHighlights:\nPublic source lead.');
  assert.equal(hits.length,2);assert.equal(hits[0].title,'Digital Handover | Autodesk Tandem');assert.equal(hits[0].publishedAt,'2021-09-01T08:56:42.000Z');assert.equal(hits[1].publishedAt,null);assert.equal(parseExaSearch('Provider unavailable').length,0);
});
