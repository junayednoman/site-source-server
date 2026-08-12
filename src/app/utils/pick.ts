const pick = <
  TQuery extends Record<string, unknown>,
  TKey extends keyof TQuery,
>(
  query: TQuery,
  queryKeys: TKey[]
): Partial<TQuery> => {
  const finalObj: Partial<TQuery> = {};
  for (const key of queryKeys) {
    if (query && query[key]) {
      finalObj[key] = query[key];
    }
  }
  return finalObj;
};

export default pick;
