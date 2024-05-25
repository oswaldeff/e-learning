import { UpdateDateColumn, CreateDateColumn } from 'typeorm';

export class BaseModel<T> {
  @UpdateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @CreateDateColumn({
    type: 'timestamp',
    precision: 0,
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  constructor(entity: Partial<T>) {
    Object.assign(this, entity);
  }
}
