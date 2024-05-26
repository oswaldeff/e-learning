import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

import { BaseModel } from 'src/common/entity/base.entity';

@Entity({ name: 'Student' })
export class StudentModel extends BaseModel<StudentModel> {
  @PrimaryGeneratedColumn()
  studentId: number;

  @Column()
  lectureId: number;
}
