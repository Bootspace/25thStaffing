import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
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

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('CandidateController', () => {
  let controller: CandidateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [{ provide: CandidateService, useValue: mockService }],
    }).compile();

    controller = module.get<CandidateController>(CandidateController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to service and returns candidate', async () => {
      const dto = { name: 'Jane Doe', email: 'jane@example.com', position: 'Engineer' };
      mockService.create.mockResolvedValue(mockCandidate);

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual(mockCandidate);
    });

    it('passes uploaded file to service', async () => {
      const dto = { name: 'Jane Doe', email: 'jane@example.com', position: 'Engineer' };
      const file = { originalname: 'resume.pdf' } as Express.Multer.File;
      mockService.create.mockResolvedValue({ ...mockCandidate, resumeUrl: '/uploads/resume.pdf' });

      await controller.create(dto, file);

      expect(mockService.create).toHaveBeenCalledWith(dto, file);
    });
  });

  describe('findAll', () => {
    it('returns all candidates', async () => {
      mockService.findAll.mockResolvedValue([mockCandidate]);

      const result = await controller.findAll();

      expect(result).toEqual([mockCandidate]);
    });
  });

  describe('findOne', () => {
    it('returns candidate when found', async () => {
      mockService.findOne.mockResolvedValue(mockCandidate);

      const result = await controller.findOne('cltest123');

      expect(result).toEqual(mockCandidate);
    });

    it('throws NotFoundException when candidate does not exist', async () => {
      mockService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
