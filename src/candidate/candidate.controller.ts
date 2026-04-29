import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CandidateService } from './candidate.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';

@ApiTags('Candidates')
@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: './uploads/tmp',
        filename: (_, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`),
      }),
      fileFilter: (_, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  @ApiOperation({ summary: 'Submit a candidate application' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        position: { type: 'string' },
        phone: { type: 'string' },
        resume: { type: 'string', format: 'binary' },
      },
      required: ['name', 'email', 'position'],
    },
  })
  @ApiCreatedResponse({ description: 'Candidate created and queued' })
  async create(
    @Body() dto: CreateCandidateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.candidateService.create(dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all candidates' })
  @ApiOkResponse({ description: 'List of candidates' })
  findAll() {
    return this.candidateService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a candidate by ID' })
  @ApiOkResponse({ description: 'Candidate found' })
  async findOne(@Param('id') id: string) {
    const candidate = await this.candidateService.findOne(id);
    if (!candidate) throw new NotFoundException(`Candidate ${id} not found`);
    return candidate;
  }
}
