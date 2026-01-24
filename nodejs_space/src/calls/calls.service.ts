import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CallFilters {
  clinicId?: string;
  intent?: string;
  status?: string;
}

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(filters: CallFilters) {
    const where: any = {};

    if (filters.clinicId) {
      where.clinic_id = filters.clinicId;
    }
    if (filters.intent) {
      where.intent = filters.intent;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const calls = await this.prisma.call.findMany({
      where,
      include: {
        clinic: true,
        patient: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    this.logger.log(`Found ${calls.length} calls`);
    return calls;
  }

  async findOne(id: string) {
    const call = await this.prisma.call.findUnique({
      where: { id },
      include: {
        clinic: true,
        patient: true,
      },
    });

    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found`);
    }

    return call;
  }
}
