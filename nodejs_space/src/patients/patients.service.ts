import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const patients = await this.prisma.patient.findMany({
      include: {
        _count: {
          select: {
            appointments: true,
            calls: true,
          },
        },
      },
    });

    this.logger.log(`Found ${patients.length} patients`);
    return patients;
  }
}
