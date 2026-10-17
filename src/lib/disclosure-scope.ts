/** Page-wide declarations apply even when a quote omits a nearby demo disclaimer. */
export function illustrativeFinancialDisclosure(text: string): boolean {
  return /all\s+(?:financial\s+)?(?:figures|amounts|metrics)\s+are\s+(?:mock|synthetic|illustrative)|synthetic\s+(?:demonstration\s+data|[^.!?]{0,100}(?:snapshot|customers|subscription revenue))|mock\s+(?:subscriptions|financial snapshot|customer mix|portfolio mix)/i.test(text);
}
