import { dbEngine } from '../db/database';
import { Employee } from '../db/schema';

export class EmployeeRepository {
  private readonly storeName = 'employees';

  public async findById(id: string): Promise<Employee | null> {
    return dbEngine.get<Employee>(this.storeName, id);
  }

  public async findByCompanyId(companyId: string): Promise<Employee[]> {
    return dbEngine.getAllByIndex<Employee>(this.storeName, 'companyId', companyId);
  }

  public async findAll(): Promise<Employee[]> {
    return dbEngine.getAll<Employee>(this.storeName);
  }

  public async findByCompanyAndEmpNo(companyId: string, employeeNumber: string): Promise<Employee | null> {
    return dbEngine.getByIndex<Employee>(this.storeName, 'companyAndEmpNo', [companyId, employeeNumber.trim().toUpperCase()]);
  }

  public async findByDepartmentId(departmentId: string): Promise<Employee[]> {
    return dbEngine.getAllByIndex<Employee>(this.storeName, 'departmentId', departmentId);
  }

  public async findByPositionId(positionId: string): Promise<Employee[]> {
    return dbEngine.getAllByIndex<Employee>(this.storeName, 'positionId', positionId);
  }

  public async save(employee: Employee): Promise<void> {
    await dbEngine.put(this.storeName, employee);
  }

  public async bulkSave(employees: Employee[]): Promise<void> {
    for (const emp of employees) {
      await dbEngine.put(this.storeName, emp);
    }
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(this.storeName, id);
  }
}

export const employeeRepository = new EmployeeRepository();
