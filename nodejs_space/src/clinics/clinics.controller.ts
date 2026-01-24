import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicsController {
  private readonly logger = new Logger(ClinicsController.name);

  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all clinics' })
  async findAll() {
    this.logger.log('Fetching all clinics');
    return await this.clinicsService.findAll();
  }
}
