import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getQueueToken } from '@nestjs/bullmq';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { CANDIDATE_QUEUE } from '../src/queue/queue.constants';
import { CandidateStatus } from '@prisma/client';

describe('CandidateController (e2e)', () => {
  let app: INestApplication;

  const mockPrismaCandidate = {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  };
  const mockPrisma = { candidate: mockPrismaCandidate };
  const mockStorage = { upload: jest.fn() };
  const mockQueue = { add: jest.fn() };

  const candidate = {
    id: 'cle2e001',
    name: 'Test User',
    email: 'test@example.com',
    phone: null,
    position: 'QA Engineer',
    resumeUrl: null,
    status: CandidateStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(StorageService)
      .useValue(mockStorage)
      .overrideProvider(getQueueToken(CANDIDATE_QUEUE))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /candidates', () => {
    it('creates a candidate and returns 201', async () => {
      mockPrismaCandidate.findUnique.mockResolvedValue(null);
      mockPrismaCandidate.create.mockResolvedValue(candidate);
      mockQueue.add.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/candidates')
        .field('name', 'Test User')
        .field('email', 'test@example.com')
        .field('position', 'QA Engineer')
        .expect(201);

      expect(res.body.email).toBe('test@example.com');
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('returns 409 when email already exists', async () => {
      mockPrismaCandidate.findUnique.mockResolvedValue(candidate);

      await request(app.getHttpServer())
        .post('/candidates')
        .field('name', 'Test User')
        .field('email', 'test@example.com')
        .field('position', 'QA Engineer')
        .expect(409);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/candidates')
        .field('email', 'bad@example.com')
        .expect(400);
    });
  });

  describe('GET /candidates', () => {
    it('returns list of candidates', async () => {
      mockPrismaCandidate.findMany.mockResolvedValue([candidate]);

      const res = await request(app.getHttpServer())
        .get('/candidates')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /candidates/:id', () => {
    it('returns candidate when found', async () => {
      mockPrismaCandidate.findUnique.mockResolvedValue(candidate);

      const res = await request(app.getHttpServer())
        .get('/candidates/cle2e001')
        .expect(200);

      expect(res.body.id).toBe('cle2e001');
    });

    it('returns 404 when candidate not found', async () => {
      mockPrismaCandidate.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/candidates/nonexistent')
        .expect(404);
    });
  });
});
