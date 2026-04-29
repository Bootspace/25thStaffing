import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CANDIDATE_QUEUE, JobNames } from './queue.constants';
import { CandidateStatus } from '@prisma/client';

export interface ProcessCandidateJobData {
  candidateId: string;
}

@Processor(CANDIDATE_QUEUE)
export class CandidateProcessor extends WorkerHost {
  private readonly logger = new Logger(CandidateProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ProcessCandidateJobData>): Promise<void> {
    if (job.name === JobNames.PROCESS_CANDIDATE) {
      await this.handleProcessCandidate(job);
    }
  }

  private async handleProcessCandidate(
    job: Job<ProcessCandidateJobData>,
  ): Promise<void> {
    const { candidateId } = job.data;
    this.logger.log(`Processing candidate ${candidateId}`);

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { status: CandidateStatus.PROCESSING },
    });

    // Simulate background processing work (e.g. resume parsing, ATS scoring)
    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { status: CandidateStatus.PROCESSED },
    });

    this.logger.log(`Candidate ${candidateId} processed successfully`);
  }
}
