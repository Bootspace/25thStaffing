import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { CandidateService } from './candidate.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CANDIDATE_QUEUE, JobNames } from '../queue/queue.constants';
import { CandidateStatus } from '@prisma/client';

const mockCandidate = {
  id: 'cltest123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  position: 'Engineer',
  resumeUrl: null,
  status: CandidateStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  candidate: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockStorage = {
  upload: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

describe('CandidateService', () => {
  let service: CandidateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: getQueueToken(CANDIDATE_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<CandidateService>(CandidateService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Jane Doe', email: 'jane@example.com', position: 'Engineer' };

    it('creates a candidate and enqueues a job', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockPrisma.candidate.create.mockResolvedValue(mockCandidate);
      mockQueue.add.mockResolvedValue({});

      const result = await service.create(dto);

      expect(mockPrisma.candidate.create).toHaveBeenCalledWith({
        data: { ...dto, resumeUrl: undefined },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.PROCESS_CANDIDATE,
        { candidateId: mockCandidate.id },
      );
      expect(result).toEqual(mockCandidate);
    });

    it('uploads resume and stores URL when file is provided', async () => {
      const file = { path: '/tmp/resume.pdf', originalname: 'resume.pdf' } as Express.Multer.File;
      const uploadResult = { url: '/uploads/resume.pdf', key: 'resumes/resume.pdf', bucket: 'mock-s3-bucket' };

      mockPrisma.candidate.findUnique.mockResolvedValue(null);
      mockStorage.upload.mockResolvedValue(uploadResult);
      mockPrisma.candidate.create.mockResolvedValue({ ...mockCandidate, resumeUrl: uploadResult.url });
      mockQueue.add.mockResolvedValue({});

      const result = await service.create(dto, file);

      expect(mockStorage.upload).toHaveBeenCalledWith(file);
      expect(mockPrisma.candidate.create).toHaveBeenCalledWith({
        data: { ...dto, resumeUrl: uploadResult.url },
      });
      expect(result.resumeUrl).toBe(uploadResult.url);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(mockCandidate);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.candidate.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all candidates ordered by createdAt desc', async () => {
      mockPrisma.candidate.findMany.mockResolvedValue([mockCandidate]);

      const result = await service.findAll();

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockCandidate]);
    });
  });

  describe('findOne', () => {
    it('returns a candidate by id', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(mockCandidate);

      const result = await service.findOne('cltest123');

      expect(result).toEqual(mockCandidate);
    });

    it('returns null when not found', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });
});
