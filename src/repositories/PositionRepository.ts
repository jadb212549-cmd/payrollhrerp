import { dbEngine } from '../db/database';
import { Position } from '../db/schema';

export class PositionRepository {
  private readonly storeName = 'positions';

  public async findById(id: string): Promise<Position | null> {
    return dbEngine.get<Position>(this.storeName, id);
  }

  public async findByCompanyId(companyId: string): Promise<Position[]> {
    return dbEngine.getAllByIndex<Position>(this.storeName, 'companyId', companyId);
  }

  public async findByDepartmentId(departmentId: string): Promise<Position[]> {
    return dbEngine.getAllByIndex<Position>(this.storeName, 'departmentId', departmentId);
  }

  public async findAll(): Promise<Position[]> {
    return dbEngine.getAll<Position>(this.storeName);
  }

  public async findByCompanyAndCode(companyId: string, code: string): Promise<Position | null> {
    return dbEngine.getByIndex<Position>(this.storeName, 'companyAndCode', [companyId, code.toUpperCase()]);
  }

  public async save(position: Position): Promise<void> {
    await dbEngine.put(this.storeName, position);
  }

  public async delete(id: string): Promise<void> {
    await dbEngine.delete(this.storeName, id);
  }
}

export const positionRepository = new PositionRepository();
