import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Map } from './Map';

@Entity('races')
export class Race {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.races)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  mapId!: string;

  @ManyToOne(() => Map)
  @JoinColumn({ name: 'mapId' })
  map!: Map;

  @Column()
  finishTime!: number; // milliseconds

  @Column({ default: false })
  isPersonalBest!: boolean;

  @Column()
  position!: number; // 1st, 2nd, etc

  @Column({ default: 0 })
  gemsEarned!: number;

  @Column()
  mode!: string; // 'normal', 'training', 'multiplayer'

  @Column({ nullable: true })
  carId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
