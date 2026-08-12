export type TPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  orderBy?: "asc" | "desc";
};
export type TReturnOptions = {
  page: number;
  skip: number;
  take: number;
  sortBy?: string;
  orderBy?: "asc" | "desc";
};

export const calculatePagination = ({
  page = 1,
  limit = 10,
  sortBy,
  orderBy,
}: TPaginationOptions): TReturnOptions => {
  const take = Number(limit);
  const skip = Number(page - 1) * take;

  return {
    page: Number(page),
    skip,
    take,
    sortBy,
    orderBy,
  };
};
