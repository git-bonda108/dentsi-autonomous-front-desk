import { Controller, Get, Patch, Param, Body, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';

class UpdateClinicPhoneDto {
  phone: string;
}

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

  @Patch(':id/phone')
  @ApiOperation({ summary: 'Update clinic phone number (for Twilio integration)' })
  @ApiParam({ name: 'id', description: 'Clinic ID' })
  @ApiBody({ type: UpdateClinicPhoneDto })
  async updatePhone(
    @Param('id') id: string,
    @Body() body: UpdateClinicPhoneDto,
  ) {
    this.logger.log(`Updating phone for clinic ${id} to ${body.phone}`);
    const clinic = await this.clinicsService.updatePhone(id, body.phone);
    if (!clinic) {
      throw new NotFoundException(`Clinic ${id} not found`);
    }
    return { success: true, clinic };
  }
}
