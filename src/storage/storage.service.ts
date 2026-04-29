import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDest: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDest = this.config.get<string>('UPLOAD_DEST', './uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDest)) {
      fs.mkdirSync(this.uploadDest, { recursive: true });
    }
  }

  /**
   * Simulates an S3 upload by moving the multer temp file to the uploads folder
   * and returning a mock S3-style URL and metadata.
   */
  async upload(file: Express.Multer.File): Promise<UploadResult> {
    const key = `resumes/${Date.now()}-${file.originalname}`;
    const dest = path.join(this.uploadDest, path.basename(key));

    fs.renameSync(file.path, dest);

    return {
      url: `/uploads/${path.basename(key)}`,
      key,
      bucket: 'mock-s3-bucket',
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDest, path.basename(key));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
