import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Car } from './Car';

@Entity('car_ownership')
export class CarOwnership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.cars)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  carId!: number;

  @ManyToOne(() => Car)
  @JoinColumn({ name: 'carId' })
  car!: Car;

  @Column({ default: 100 })
  condition!: number; // 0-100, damaged if < 100

  @CreateDateColumn()
  purchasedAt!: Date;
}
