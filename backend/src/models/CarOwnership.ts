import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Car } from './Car';

@Entity('car_ownership')
export class CarOwnership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.cars)
  user!: User;

  @ManyToOne(() => Car)
  car!: Car;

  @Column({ default: 100 })
  condition!: number; // 0-100, damaged if < 100

  @CreateDateColumn()
  purchasedAt!: Date;
}
