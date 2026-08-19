/**
 * Database Engine & Storage Abstraction Layer
 * Offline Persistent Storage for Tauri Desktop & Web Environments
 */

const DB_NAME = 'payroll_erp_master_db';
const DB_VERSION = 4;

export class DatabaseEngine {
  private static instance: DatabaseEngine | null = null;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseEngine {
    if (!DatabaseEngine.instance) {
      DatabaseEngine.instance = new DatabaseEngine();
    }
    return DatabaseEngine.instance;
  }

  public async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this runtime environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 1. Schema Migrations Store
        if (!db.objectStoreNames.contains('schema_migrations')) {
          const migrationStore = db.createObjectStore('schema_migrations', { keyPath: 'version' });
          migrationStore.createIndex('appliedAt', 'appliedAt', { unique: false });
        }

        // 2. Companies Store
        if (!db.objectStoreNames.contains('companies')) {
          const companyStore = db.createObjectStore('companies', { keyPath: 'id' });
          companyStore.createIndex('companyCode', 'companyCode', { unique: true });
          companyStore.createIndex('status', 'status', { unique: false });
          companyStore.createIndex('legalName', 'legalName', { unique: false });
          companyStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 3. Users Store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('status', 'status', { unique: false });
        }

        // 4. Roles Store
        if (!db.objectStoreNames.contains('roles')) {
          const roleStore = db.createObjectStore('roles', { keyPath: 'id' });
          roleStore.createIndex('name', 'name', { unique: true });
        }

        // 5. User-Company Associations Store
        if (!db.objectStoreNames.contains('user_companies')) {
          const ucStore = db.createObjectStore('user_companies', { keyPath: 'id' });
          ucStore.createIndex('userId', 'userId', { unique: false });
          ucStore.createIndex('companyId', 'companyId', { unique: false });
          ucStore.createIndex('userAndCompany', ['userId', 'companyId'], { unique: true });
        }

        // 6. Audit Logs Store
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('companyId', 'companyId', { unique: false });
          auditStore.createIndex('userId', 'userId', { unique: false });
          auditStore.createIndex('entityType', 'entityType', { unique: false });
          auditStore.createIndex('action', 'action', { unique: false });
        }

        // 7. Application Settings Store
        if (!db.objectStoreNames.contains('application_settings')) {
          db.createObjectStore('application_settings', { keyPath: 'id' });
        }

        // --- Phase 3 Stores ---
        // 8. Departments Store
        if (!db.objectStoreNames.contains('departments')) {
          const deptStore = db.createObjectStore('departments', { keyPath: 'id' });
          deptStore.createIndex('companyId', 'companyId', { unique: false });
          deptStore.createIndex('code', 'code', { unique: false });
          deptStore.createIndex('status', 'status', { unique: false });
          deptStore.createIndex('companyAndCode', ['companyId', 'code'], { unique: true });
        }

        // 9. Positions Store
        if (!db.objectStoreNames.contains('positions')) {
          const posStore = db.createObjectStore('positions', { keyPath: 'id' });
          posStore.createIndex('companyId', 'companyId', { unique: false });
          posStore.createIndex('code', 'code', { unique: false });
          posStore.createIndex('departmentId', 'departmentId', { unique: false });
          posStore.createIndex('status', 'status', { unique: false });
          posStore.createIndex('companyAndCode', ['companyId', 'code'], { unique: true });
        }

        // 10. Employees Store
        if (!db.objectStoreNames.contains('employees')) {
          const empStore = db.createObjectStore('employees', { keyPath: 'id' });
          empStore.createIndex('companyId', 'companyId', { unique: false });
          empStore.createIndex('employeeNumber', 'employeeNumber', { unique: false });
          empStore.createIndex('departmentId', 'departmentId', { unique: false });
          empStore.createIndex('positionId', 'positionId', { unique: false });
          empStore.createIndex('employmentStatus', 'employmentStatus', { unique: false });
          empStore.createIndex('employmentType', 'employmentType', { unique: false });
          empStore.createIndex('status', 'status', { unique: false });
          empStore.createIndex('companyAndEmpNo', ['companyId', 'employeeNumber'], { unique: true });
        }

        // 11. Employee Rate History Store
        if (!db.objectStoreNames.contains('employee_rate_history')) {
          const rateStore = db.createObjectStore('employee_rate_history', { keyPath: 'id' });
          rateStore.createIndex('employeeId', 'employeeId', { unique: false });
          rateStore.createIndex('companyId', 'companyId', { unique: false });
          rateStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
        }

        // --- Phase 4 Timekeeping Stores ---
        // 12. DTR Records Store
        if (!db.objectStoreNames.contains('dtr_records')) {
          const dtrStore = db.createObjectStore('dtr_records', { keyPath: 'id' });
          dtrStore.createIndex('companyId', 'companyId', { unique: false });
          dtrStore.createIndex('employeeId', 'employeeId', { unique: false });
          dtrStore.createIndex('date', 'date', { unique: false });
          dtrStore.createIndex('status', 'status', { unique: false });
          dtrStore.createIndex('companyAndDate', ['companyId', 'date'], { unique: false });
          dtrStore.createIndex('companyAndEmployee', ['companyId', 'employeeId'], { unique: false });
          dtrStore.createIndex('companyEmpDate', ['companyId', 'employeeId', 'date'], { unique: true });
        }

        // 13. Overtime Requests Store
        if (!db.objectStoreNames.contains('overtime_requests')) {
          const otStore = db.createObjectStore('overtime_requests', { keyPath: 'id' });
          otStore.createIndex('companyId', 'companyId', { unique: false });
          otStore.createIndex('employeeId', 'employeeId', { unique: false });
          otStore.createIndex('date', 'date', { unique: false });
          otStore.createIndex('status', 'status', { unique: false });
        }

        // --- Phase 5 Configurable & Versioned Payroll Engine Stores ---
        // 14. Payroll Rules Store
        if (!db.objectStoreNames.contains('payroll_rules')) {
          const ruleStore = db.createObjectStore('payroll_rules', { keyPath: 'id' });
          ruleStore.createIndex('companyId', 'companyId', { unique: false });
          ruleStore.createIndex('ruleCode', 'ruleCode', { unique: false });
          ruleStore.createIndex('category', 'category', { unique: false });
          ruleStore.createIndex('status', 'status', { unique: false });
          ruleStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
          ruleStore.createIndex('codeAndVersion', ['ruleCode', 'version'], { unique: false });
        }

        // 15. Payroll Periods Store
        if (!db.objectStoreNames.contains('payroll_periods')) {
          const periodStore = db.createObjectStore('payroll_periods', { keyPath: 'id' });
          periodStore.createIndex('companyId', 'companyId', { unique: false });
          periodStore.createIndex('periodCode', 'periodCode', { unique: false });
          periodStore.createIndex('status', 'status', { unique: false });
          periodStore.createIndex('startDate', 'startDate', { unique: false });
          periodStore.createIndex('endDate', 'endDate', { unique: false });
        }

        // 16. Payroll Runs Store
        if (!db.objectStoreNames.contains('payroll_runs')) {
          const runStore = db.createObjectStore('payroll_runs', { keyPath: 'id' });
          runStore.createIndex('companyId', 'companyId', { unique: false });
          runStore.createIndex('periodId', 'periodId', { unique: false });
          runStore.createIndex('status', 'status', { unique: false });
          runStore.createIndex('runDate', 'runDate', { unique: false });
        }

        // 17. Payslip Records Store
        if (!db.objectStoreNames.contains('payslip_records')) {
          const slipStore = db.createObjectStore('payslip_records', { keyPath: 'id' });
          slipStore.createIndex('companyId', 'companyId', { unique: false });
          slipStore.createIndex('payrollRunId', 'payrollRunId', { unique: false });
          slipStore.createIndex('payrollPeriodId', 'payrollPeriodId', { unique: false });
          slipStore.createIndex('employeeId', 'employeeId', { unique: false });
          slipStore.createIndex('status', 'status', { unique: false });
          slipStore.createIndex('runAndEmp', ['payrollRunId', 'employeeId'], { unique: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        reject(new Error(`Failed to initialize database: ${error?.message || 'Unknown error'}`));
      };
    });

    return this.initPromise;
  }

  /**
   * Generic get by ID
   */
  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDB();
    return new Promise<T | null>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generic get all
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generic put (insert or update)
   */
  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generic delete
   */
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get by index
   */
  public async getByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey
  ): Promise<T | null> {
    const db = await this.getDB();
    return new Promise<T | null>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.get(key);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get all by index
   */
  public async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey
  ): Promise<T[]> {
    const db = await this.getDB();
    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.getAll(key);

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Execute atomic transaction over multiple stores
   */
  public async executeTransaction<T>(
    storeNames: string[],
    mode: IDBTransactionMode,
    callback: (tx: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise<T>((resolve, reject) => {
      try {
        const tx = db.transaction(storeNames, mode);
        
        callback(tx)
          .then((result) => {
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted'));
          })
          .catch((err) => {
            try {
              tx.abort();
            } catch {
              // Ignore if already completed/aborted
            }
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const dbEngine = DatabaseEngine.getInstance();
