import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('maps')
export class Map {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ default: '' })
  description!: string;

  @Column({ type: 'jsonb', default: [] })
  checkpoints!: any[];

  @Column({ type: 'jsonb', default: [] })
  trackPath!: any[];

  @Column({ type: 'jsonb', default: [] })
  obstacles!: any[];

  // Full 3D editor scene data — all placed objects, transforms, textures
  @Column({ type: 'jsonb', default: [] })
  sceneData!: any[];

  // Uploaded asset references [{ name, url, type }]
  @Column({ type: 'jsonb', default: [] })
  assets!: any[];

  @Column({ default: 3 })
  difficulty!: number; // 1-5

  @Column({ default: false })
  isPublic!: boolean;

  @Column()
  creatorId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
