import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CANDIDATE_QUEUE, JobNames } from '../queue/queue.constants';
import { Candidate } from '@prisma/client';

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(CANDIDATE_QUEUE) private readonly candidateQueue: Queue,
  ) {}

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
  ): Promise<Candidate> {
    const existing = await this.prisma.candidate.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `Candidate with email ${dto.email} already exists`,
      );
    }

    let resumeUrl: string | undefined;
    if (file) {
      const upload = await this.storage.upload(file);
      resumeUrl = upload.url;
      this.logger.log(`Resume uploaded to ${upload.url}`);
    }

    const candidate = await this.prisma.candidate.create({
      data: { ...dto, resumeUrl },
    });

    await this.candidateQueue.add(JobNames.PROCESS_CANDIDATE, {
      candidateId: candidate.id,
    });

    this.logger.log(`Queued processing job for candidate ${candidate.id}`);
    return candidate;
  }

  async findAll(): Promise<Candidate[]> {
    return this.prisma.candidate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({ where: { id } });
  }
}
