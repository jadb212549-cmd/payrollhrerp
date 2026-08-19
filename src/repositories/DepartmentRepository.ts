import { dbEngine } from '../db/database';
import { Department } from '../db/schema';

export class DepartmentRepository {
  private readonly storeName = 'departments';

  public async findById(id: string): Promise<Department | null> {
    return dbEngine.get<Department>(this.storeName, id);
  }

  public async findByCompanyId(companyId: string): Promise<Department[]> {
    return dbEngine.getAllByIndex<Department>(this.storeName, 'companyId', companyId);
  }

  public async findAll(): Promise<Department[]> {
    return dbEngine.getAll<Department>(this.storeName);
  }

  public async findByCompanyAndCode(companyId: string, code: string): Promise<Department | null> {
    return dbEngine.getByIndex<Department>(this.storeName, 'companyAndCode', [companyId, code.toUpperCase()]);
  }

  public async save(department: Department): Promise<void> {
    await dbEngine.put(this.storeName, department);
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(this.storeName, id);
  }
}

export const departmentRepository = new DepartmentRepository();
