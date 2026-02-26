import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('parties')
export class Party {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'simple-array' })
  memberIds!: string[]; // array of user IDs

  @Column()
  leaderId!: string;

  @Column({ type: 'simple-array', nullable: true })
  invitedIds!: string[]; // pending invites

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  expiresAt!: Date;
}
