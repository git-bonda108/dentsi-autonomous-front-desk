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

  async updatePhone(id: string, phone: string) {
    try {
      const clinic = await this.prisma.clinic.update({
        where: { id },
        data: { phone },
      });
      this.logger.log(`Updated clinic ${id} phone to ${phone}`);
      return clinic;
    } catch (error) {
      this.logger.error(`Failed to update clinic ${id}: ${error.message}`);
      return null;
    }
  }

  async findByPhone(phone: string) {
    return this.prisma.clinic.findFirst({
      where: { phone },
      include: {
        services: true,
      },
    });
  }
}
