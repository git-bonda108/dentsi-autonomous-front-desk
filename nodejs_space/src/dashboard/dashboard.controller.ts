import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('api/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns overall metrics including total calls, successful bookings, escalations, and revenue',
  })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved' })
  async getStats(
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.log(
        `Getting dashboard stats - clinicId: ${clinicId}, startDate: ${startDate}, endDate: ${endDate}`,
      );
      const stats = await this.dashboardService.getStats(
        clinicId,
        startDate,
        endDate,
      );
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve dashboard statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calls')
  @ApiOperation({
    summary: 'List all calls with filtering',
    description:
      'Returns paginated list of calls with optional filters by clinic, date range, and status',
  })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Calls list retrieved' })
  async getCalls(
    @Query('clinicId') clinicId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    try {
      this.logger.log(
        `Getting calls - clinicId: ${clinicId}, status: ${status}, page: ${page}, limit: ${limit}`,
      );
      const calls = await this.dashboardService.getCalls(
        clinicId,
        status,
        startDate,
        endDate,
        parseInt(page),
        parseInt(limit),
      );
      return {
        success: true,
        data: calls.data,
        pagination: calls.pagination,
      };
    } catch (error) {
      this.logger.error(`Error getting calls: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve calls',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calls/:id')
  @ApiOperation({
    summary: 'Get call details',
    description: 'Returns detailed information about a specific call',
  })
  @ApiResponse({ status: 200, description: 'Call details retrieved' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async getCallDetails(@Param('id') id: string) {
    try {
      this.logger.log(`Getting call details for ID: ${id}`);
      const call = await this.dashboardService.getCallDetails(id);
      if (!call) {
        throw new HttpException('Call not found', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: call,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error getting call details: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve call details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'List all appointments with filtering',
    description:
      'Returns paginated list of appointments with optional filters by clinic, date range, and status',
  })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Appointments list retrieved' })
  async getAppointments(
    @Query('clinicId') clinicId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    try {
      this.logger.log(
        `Getting appointments - clinicId: ${clinicId}, status: ${status}, page: ${page}, limit: ${limit}`,
      );
      const appointments = await this.dashboardService.getAppointments(
        clinicId,
        status,
        startDate,
        endDate,
        parseInt(page),
        parseInt(limit),
      );
      return {
        success: true,
        data: appointments.data,
        pagination: appointments.pagination,
      };
    } catch (error) {
      this.logger.error(
        `Error getting appointments: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve appointments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('escalations')
  @ApiOperation({
    summary: 'Get escalation queue',
    description:
      'Returns list of calls that require staff attention (callbacks, escalations)',
  })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Escalation queue retrieved' })
  async getEscalations(
    @Query('clinicId') clinicId?: string,
    @Query('type') type?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    try {
      this.logger.log(
        `Getting escalations - clinicId: ${clinicId}, type: ${type}, page: ${page}`,
      );
      const escalations = await this.dashboardService.getEscalations(
        clinicId,
        type,
        parseInt(page),
        parseInt(limit),
      );
      return {
        success: true,
        data: escalations.data,
        pagination: escalations.pagination,
      };
    } catch (error) {
      this.logger.error(
        `Error getting escalations: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve escalations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('escalations/:id/resolve')
  @ApiOperation({
    summary: 'Mark escalation as resolved',
    description: 'Updates call status to resolved after staff handles it',
  })
  @ApiResponse({ status: 200, description: 'Escalation resolved' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async resolveEscalation(@Param('id') id: string) {
    try {
      this.logger.log(`Resolving escalation for call ID: ${id}`);
      const updated = await this.dashboardService.resolveEscalation(id);
      if (!updated) {
        throw new HttpException('Call not found', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Escalation resolved successfully',
        data: updated,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error resolving escalation: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to resolve escalation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health metrics',
    description:
      'Returns system health indicators including error rates, success rates, and service status',
  })
  @ApiQuery({ name: 'clinicId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getHealth(@Query('clinicId') clinicId?: string) {
    try {
      this.logger.log(`Getting system health - clinicId: ${clinicId}`);
      const health = await this.dashboardService.getSystemHealth(clinicId);
      return {
        success: true,
        data: health,
      };
    } catch (error) {
      this.logger.error(
        `Error getting system health: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve system health',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
