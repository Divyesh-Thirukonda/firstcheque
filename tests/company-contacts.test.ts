import test from 'node:test';import assert from 'node:assert/strict';
import {extractWebsitePhones} from '../src/lib/company-contacts';
import {readablePage} from '../src/lib/safe-fetch';
test('official website contact links are normalized, sourced and never count as call consent',()=>{
 const page={url:'https://startup.example/contact',text:'Contact +44 20 7946 0958',links:['tel:+1-212-555-0123','tel:+1-212-555-0123','tel:123','tel:02079460958']};
 const phones=extractWebsitePhones(page,'https://startup.example');assert.equal(phones.length,2);assert.equal(phones[0].number,'+12125550123');assert.equal(phones[0].consent,'not-established');assert.equal(phones[0].sourceUrl,page.url);assert.equal(extractWebsitePhones(page,'https://other.example').length,0);
});
test('footer phone survives contact extraction without polluting research prose',()=>{
 const page=readablePage('<html><body><main>'+('Product research text. '.repeat(10))+'</main><footer>Contact +44 20 7946 0958</footer></body></html>','text/html');
 assert.ok(!page.text.includes('Contact'));assert.equal(extractWebsitePhones({...page,url:'https://startup.example'},'https://startup.example')[0].number,'+442079460958');
});
