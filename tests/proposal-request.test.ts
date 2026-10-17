import test from 'node:test';
import assert from 'node:assert/strict';
import {FRONTEND_ORIGINS,proposalOriginAllowed} from '../src/lib/frontend-origins';
import {proposalRequestAllowed} from '../src/lib/proposal-request';
const make=(origin:string,ip='origin-test')=>new Request('https://seed-street.vercel.app/api/proposals/voice',{headers:{origin,'x-forwarded-for':ip}});
test('the exact published and preview Ninoo origins may use proposal APIs',()=>{
 for(const origin of FRONTEND_ORIGINS)assert.equal(proposalRequestAllowed(make(origin,origin),'voice'),true);
 assert.equal(proposalOriginAllowed(make('https://seed-street.vercel.app')),true);
});
test('unrelated and lookalike origins remain blocked',()=>{
 for(const origin of ['https://unrelated.example',FRONTEND_ORIGINS[0]+'.evil.example','null'])assert.equal(proposalRequestAllowed(make(origin),'voice'),false);
});
test('same-origin local requests survive Next internal host normalization',()=>{
 const request=new Request('http://localhost:3000/api/proposals/voice',{headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'}});
 assert.equal(proposalOriginAllowed(request),true);
});
test('trusted cross-origin access does not bypass the six-request limit',()=>{
 const request=make(FRONTEND_ORIGINS[0],'bounded-test');
 for(let i=0;i<6;i++)assert.equal(proposalRequestAllowed(request,'terms'),true);
 assert.equal(proposalRequestAllowed(request,'terms'),false);
 assert.equal(proposalRequestAllowed(request,'voice'),true);
});
