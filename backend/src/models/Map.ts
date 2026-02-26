import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('maps')
export class Map {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ type: 'simple-array' })
  checkpoints!: string[]; // JSON array of checkpoint coordinates

  @Column({ type: 'simple-array' })
  trackPath!: string[]; // JSON array of track points

  @Column({ type: 'simple-array' })
  obstacles!: string[]; // JSON array of obstacle data

  @Column()
  difficulty!: number; // 1-5

  @Column({ default: false })
  isPublic!: boolean;

  @Column()
  creatorId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
