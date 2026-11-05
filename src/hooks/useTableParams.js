import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const positiveInt = (value, fallback, max = Infinity) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
};

const MAX_LIMIT = 100;

// The URL is the single source of truth, so a reload or shared link restores the same table.
export default function useTableParams({ defaultLimit = 20, defaultSort = 'newest' } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = positiveInt(searchParams.get('page'), 1);
  const limit = positiveInt(searchParams.get('limit'), defaultLimit, MAX_LIMIT);
  const sort = searchParams.get('sort') || defaultSort;

  const filters = useMemo(() => {
    const values = Object.fromEntries(searchParams.entries());
    delete values.page;
    delete values.limit;
    delete values.sort;
    return values;
  }, [searchParams]);

  const params = useMemo(() => ({ ...filters, page, limit, sort }), [filters, page, limit, sort]);

  const update = useCallback(
    (changes, options) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '' || value === false) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });
        return next;
      }, options),
    [setSearchParams]
  );

  // Changing what is shown starts again from the first page.
  const setFilters = useCallback(
    (changes, options) => update({ ...changes, page: undefined }, options),
    [update]
  );
  const setPage = useCallback(
    (nextPage, nextLimit) => update({ page: nextPage, limit: nextLimit }),
    [update]
  );
  const setSort = useCallback((value) => update({ sort: value, page: undefined }), [update]);
  const reset = useCallback(() => setSearchParams({}), [setSearchParams]);

  return { params, filters, page, limit, sort, setFilters, setPage, setSort, reset };
}
