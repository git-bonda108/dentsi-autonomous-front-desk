import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CallsService } from './calls.service';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  constructor(private readonly callsService: CallsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calls with optional filters' })
  @ApiQuery({ name: 'clinicId', required: false })
  @ApiQuery({ name: 'intent', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('clinicId') clinicId?: string,
    @Query('intent') intent?: string,
    @Query('status') status?: string,
  ) {
    this.logger.log(
      `Fetching calls with filters: clinicId=${clinicId}, intent=${intent}, status=${status}`,
    );
    return await this.callsService.findAll({ clinicId, intent, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific call by ID' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching call: ${id}`);
    return await this.callsService.findOne(id);
  }
}
