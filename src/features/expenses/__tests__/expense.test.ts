import { expenseFormSchema } from '../validation';
import { expenseService } from '@/src/services/expense.service';
import { localStore } from '@/src/database/localStore';
import { supabase } from '@/src/services/supabase/client';

let uuidCounter = 1;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `test-expense-uuid-${uuidCounter++}`),
}));

jest.mock('@/src/services/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/src/services/network.service', () => ({
  networkService: {
    isOnline: jest.fn(() => false),
  },
}));

describe('Expense Module Unit Tests', () => {
  const mockUserId = 'test-user-uuid-123';

  beforeEach(async () => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
    await localStore.clearUserStore(mockUserId);
  });

  afterEach(async () => {
    await localStore.clearUserStore(mockUserId);
  });

  describe('Expense Form Validation', () => {
    it('should validate valid expense data', () => {
      const result = expenseFormSchema.safeParse({
        expense_date: '2026-09-02',
        amount: 150,
      });
      expect(result.success).toBe(true);
    });

    it('should validate decimal amounts (e.g. 150.50)', () => {
      const result = expenseFormSchema.safeParse({
        expense_date: '2026-09-02',
        amount: 150.5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive or 0 amounts', () => {
      const zeroResult = expenseFormSchema.safeParse({
        expense_date: '2026-09-02',
        amount: 0,
      });
      expect(zeroResult.success).toBe(false);

      const negResult = expenseFormSchema.safeParse({
        expense_date: '2026-09-02',
        amount: -50,
      });
      expect(negResult.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = expenseFormSchema.safeParse({
        expense_date: '02-09-2026',
        amount: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Expense Service CRUD (Offline-First)', () => {
    it('should create an expense and store amount in paise', async () => {
      const res = await expenseService.createExpense({
        expense_date: '2026-09-02',
        amount: 150, // ₹150
      });

      expect(res.data).not.toBeNull();
      expect(res.data?.amount).toBe(15000); // 15000 paise
      expect(res.data?.expense_date).toBe('2026-09-02');

      const localList = await localStore.getExpenses(mockUserId);
      expect(localList.length).toBe(1);
      expect(localList[0].amount).toBe(15000);
      expect(localList[0].sync_status).toBe('PENDING_CREATE');

      // Check sync queue
      const queue = await localStore.getSyncQueue(mockUserId);
      expect(queue.length).toBe(1);
      expect(queue[0].entity).toBe('EXPENSE');
      expect(queue[0].operation).toBe('CREATE');
    });

    it('should filter expenses by date range', async () => {
      await expenseService.createExpense({ expense_date: '2026-09-01', amount: 100 });
      await expenseService.createExpense({ expense_date: '2026-09-02', amount: 150 });
      await expenseService.createExpense({ expense_date: '2026-09-10', amount: 300 });

      const all = await expenseService.getExpenses();
      expect(all.length).toBe(3);

      const sept1to2 = await expenseService.getExpenses('2026-09-01', '2026-09-02');
      expect(sept1to2.length).toBe(2);

      const sept2only = await expenseService.getExpenses('2026-09-02', '2026-09-02');
      expect(sept2only.length).toBe(1);
      expect(sept2only[0].amount).toBe(15000);
    });

    it('should update an existing expense', async () => {
      const created = await expenseService.createExpense({
        expense_date: '2026-09-02',
        amount: 150,
      });
      const id = created.data!.id;

      const updated = await expenseService.updateExpense(id, {
        expense_date: '2026-09-03',
        amount: 200,
      });

      expect(updated.data?.amount).toBe(20000); // ₹200 = 20000 paise
      expect(updated.data?.expense_date).toBe('2026-09-03');

      const fetched = await expenseService.getExpenseById(id);
      expect(fetched?.amount).toBe(20000);
      expect(fetched?.expense_date).toBe('2026-09-03');
    });

    it('should delete an expense safely', async () => {
      const created = await expenseService.createExpense({
        expense_date: '2026-09-02',
        amount: 150,
      });
      const id = created.data!.id;

      const deleteRes = await expenseService.deleteExpense(id);
      expect(deleteRes.data).toBe(true);

      const listAfter = await localStore.getExpenses(mockUserId);
      expect(listAfter.length).toBe(0);
    });
  });
});
