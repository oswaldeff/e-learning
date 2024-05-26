import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

import { BaseModel } from 'src/common/entity/base.entity';

@Entity({ name: 'Attend' })
export class AttendModel extends BaseModel<AttendModel> {
  @PrimaryGeneratedColumn()
  attendId: number;

  @Column()
  studentId: number;

  @Column()
  lectureId: number;
}
