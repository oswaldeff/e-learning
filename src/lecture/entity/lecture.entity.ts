import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

import { BaseModel } from 'src/common/entity/base.entity';

@Entity({ name: 'Lecture' })
export class LectureModel extends BaseModel<LectureModel> {
  @PrimaryGeneratedColumn()
  lectureId: number;

  @Column()
  maxAttendees: number;

  @Column()
  lectureSecretCode: string;

  @Column()
  teacherId: string;

  @Column({ nullable: true })
  students: string;
}
