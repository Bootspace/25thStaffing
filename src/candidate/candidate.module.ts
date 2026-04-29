import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { StorageModule } from '../storage/storage.module';
import { CANDIDATE_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({ name: CANDIDATE_QUEUE }),
  ],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
