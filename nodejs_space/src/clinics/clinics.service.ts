import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClinicsService {
  private readonly logger = new Logger(ClinicsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const clinics = await this.prisma.clinic.findMany({
      include: {
        services: true,
        _count: {
          select: {
            appointments: true,
            calls: true,
          },
        },
      },
    });

    this.logger.log(`Found ${clinics.length} clinics`);
    return clinics;
  }
}
