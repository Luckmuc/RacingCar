import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Race } from './Race';
import { CarOwnership } from './CarOwnership';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({ default: 0 })
  gems!: number;

  @Column({ default: 0 })
  totalRaces!: number;

  @Column({ default: 0 })
  totalWins!: number;

  @Column({ default: 0 })
  level!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Race, (race) => race.user)
  races!: Race[];

  @OneToMany(() => CarOwnership, (carOwnership) => carOwnership.user)
  cars!: CarOwnership[];
}
