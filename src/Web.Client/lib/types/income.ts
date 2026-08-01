export type AllocationLine = {
  accountId: string;
  amount: number;
};

export type IncomeRequest = {
  amount: number;
  source: string;
  date: string;
  allocations: AllocationLine[];
};

export type Income = {
  id: string;
  amount: number;
  source: string;
  date: string;
  allocations: AllocationLine[];
};
