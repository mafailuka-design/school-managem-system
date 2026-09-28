/**
 * Small helpers shared by the list endpoints: in-memory filtering,
 * sorting and pagination. Stands in for SQL LIMIT/OFFSET/ORDER BY.
 */

const matchesSearch = (record, term, fields) => {
  if (!term) return true;
  const needle = term.toLowerCase();
  return fields.some(
    (field) => String(record[field] ?? '').toLowerCase().includes(needle)
  );
};

const applyListOptions = (records, { page, limit, sort, search }, searchFields = []) => {
  let output = records;

  if (search && searchFields.length) {
    output = output.filter((record) => matchesSearch(record, search, searchFields));
  }

  if (sort) {
    const direction = sort === 'desc' ? -1 : 1;
    output = [...output].sort((a, b) => {
      const left = a.createdAt || '';
      const right = b.createdAt || '';
      return left > right ? direction : left < right ? -direction : 0;
    });
  }

  const total = output.length;
  const start = (page - 1) * limit;
  const paginated = output.slice(start, start + limit);

  return {
    records: paginated,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      count: paginated.length,
    },
  };
};

module.exports = { applyListOptions };
