import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { CATALOG_SEEDS } from '../src/lib/catalog-seeds';
import { newProposal, groundProposalTerms } from '../src/lib/proposals';
import { contractText } from '../src/lib/proposal-contract';
import { generateProposalPdf } from '../src/lib/proposal-pdf';

test('contract draft keeps unagreed terms editable and leaves execution blank', () => {
 const draft=newProposal(CATALOG_SEEDS[0]); draft.investorName='Demo Investor'; draft.amount=1;
 draft.terms=[{key:'ownership',value:'100% proposed by investor, subject to issuer review',quote:'',edited:true}];
 const text=contractText(draft);
 assert.match(text,/DRAFT - PENDING SIGNATURES/);
 assert.match(text,/100% proposed by investor/); assert.match(text,/Investor-edited proposal/);
 assert.match(text,/TO BE CONFIRMED: issuer's authorized representative/);
 assert.match(text,/Investor signature: _+/); assert.doesNotMatch(text,/Investor signature: Demo Investor/);
 assert.match(text,/verbal expression of interest/);
});
test('a verbal yes is evidence of interest, never a signature or inferred economics',()=>{
 const terms=groundProposalTerms({terms:[{key:'interest',value:'Yes',quote:'Yes, send a draft.'},{key:'ownership',value:'100%',quote:'I accept 100%.'}]},'Founder: Yes, send a draft.');
 assert.deepEqual(terms.map(t=>t.key),['interest']);
 const draft=newProposal(CATALOG_SEEDS[0]); draft.terms=terms;
 assert.match(contractText(draft),/Neither party has signed/);
 assert.match(contractText(draft),/proposed ownership and dilution basis/);
});
test('PDF paginates long terms and has no signature fields',async()=>{
 const draft=newProposal(CATALOG_SEEDS[0]); draft.sample=true;
 draft.terms=[{key:'rights',value:'Proposed rights remain subject to review. '.repeat(17),quote:'',edited:true}];
 const font=await readFile('public/fonts/Geist-Regular.ttf');
 const bytes=await generateProposalPdf(draft,font); const pdf=await PDFDocument.load(bytes);
 assert.ok(pdf.getPageCount()>=3); assert.equal(pdf.getForm().getFields().length,0);
 assert.match(pdf.getTitle()||'',/Draft Pending Signatures/);
 for(const page of pdf.getPages()) assert.equal(Math.round(page.getWidth()),595);
});
