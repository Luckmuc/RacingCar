import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cars')
export class Car {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maxSpeed!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  acceleration!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  handling!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  durability!: number;

  @Column()
  price!: number; // in gems

  @Column({ type: 'decimal', precision: 7, scale: 2 })
  weight!: number; // kg

  @Column()
  color!: string; // hex color

  @Column({ nullable: true })
  imageUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
