import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   */
  async getStats(
    clinicId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    try {
      const where: any = {};
      if (clinicId) where.clinic_id = clinicId;
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [totalCalls, completedCalls, failedCalls, escalatedCalls] =
        await Promise.all([
          this.prisma.call.count({ where }),
          this.prisma.call.count({ where: { ...where, status: 'completed' } }),
          this.prisma.call.count({ where: { ...where, status: 'failed' } }),
          this.prisma.call.count({
            where: { ...where, status: { in: ['callback', 'escalated'] } },
          }),
        ]);

      // Get appointments stats
      const appointmentWhere: any = {};
      if (clinicId) appointmentWhere.clinic_id = clinicId;
      if (startDate || endDate) {
        appointmentWhere.created_at = {};
        if (startDate) appointmentWhere.created_at.gte = new Date(startDate);
        if (endDate) appointmentWhere.created_at.lte = new Date(endDate);
      }

      const [totalAppointments, confirmedAppointments, cancelledAppointments] =
        await Promise.all([
          this.prisma.appointment.count({ where: appointmentWhere }),
          this.prisma.appointment.count({
            where: { ...appointmentWhere, status: 'confirmed' },
          }),
          this.prisma.appointment.count({
            where: { ...appointmentWhere, status: 'cancelled' },
          }),
        ]);

      // Calculate estimated revenue from confirmed appointments
      const revenueMap: Record<string, number> = {
        cleaning: 150,
        'exam': 200,
        'filling': 300,
        'crown': 1500,
        'root_canal': 1200,
        'extraction': 400,
        'implant': 5000,
        'whitening': 500,
        'emergency': 250,
      };

      const confirmedAppts = await this.prisma.appointment.findMany({
        where: { ...appointmentWhere, status: 'confirmed' },
        select: { service_type: true },
      });

      const estimatedRevenue = confirmedAppts.reduce(
        (sum, appt) => sum + (revenueMap[appt.service_type] || 0),
        0,
      );

      const successRate =
        totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

      this.logger.log(`Stats calculated - Total calls: ${totalCalls}, Success rate: ${successRate.toFixed(2)}%`);

      return {
        calls: {
          total: totalCalls,
          completed: completedCalls,
          failed: failedCalls,
          escalated: escalatedCalls,
          successRate: parseFloat(successRate.toFixed(2)),
        },
        appointments: {
          total: totalAppointments,
          confirmed: confirmedAppointments,
          cancelled: cancelledAppointments,
          confirmationRate:
            totalAppointments > 0
              ? parseFloat(
                  ((confirmedAppointments / totalAppointments) * 100).toFixed(
                    2,
                  ),
                )
              : 0,
        },
        revenue: {
          estimated: estimatedRevenue,
          currency: 'USD',
        },
      };
    } catch (error) {
      this.logger.error(
        `Error calculating stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get paginated calls with filtering
   */
  async getCalls(
    clinicId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    try {
      const where: any = {};
      if (clinicId) where.clinic_id = clinicId;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [calls, total] = await Promise.all([
        this.prisma.call.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            clinic: { select: { id: true, name: true } },
            patient: {
              select: { id: true, name: true, phone: true },
            },
          },
        }),
        this.prisma.call.count({ where }),
      ]);

      this.logger.log(`Retrieved ${calls.length} calls (page ${page}/${Math.ceil(total / limit)})`);

      return {
        data: calls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting calls: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get call details with full metadata
   */
  async getCallDetails(id: string): Promise<any> {
    try {
      const call = await this.prisma.call.findUnique({
        where: { id },
        include: {
          clinic: true,
          patient: true,
          appointments: {
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (call) {
        this.logger.log(`Retrieved call details for ID: ${id}`);
      }

      return call;
    } catch (error) {
      this.logger.error(
        `Error getting call details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get paginated appointments with filtering
   */
  async getAppointments(
    clinicId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    try {
      const where: any = {};
      if (clinicId) where.clinic_id = clinicId;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.appointment_date = {};
        if (startDate) where.appointment_date.gte = new Date(startDate);
        if (endDate) where.appointment_date.lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [appointments, total] = await Promise.all([
        this.prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { appointment_date: 'asc' },
          include: {
            clinic: { select: { id: true, name: true } },
            patient: {
              select: { id: true, name: true, phone: true },
            },
          },
        }),
        this.prisma.appointment.count({ where }),
      ]);

      this.logger.log(`Retrieved ${appointments.length} appointments (page ${page}/${Math.ceil(total / limit)})`);

      return {
        data: appointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting appointments: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get escalation queue (callbacks and escalated calls)
   */
  async getEscalations(
    clinicId?: string,
    type?: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    try {
      const where: any = {
        status: { in: ['callback', 'escalated'] },
      };
      if (clinicId) where.clinic_id = clinicId;
      if (type) where.status = type;

      const skip = (page - 1) * limit;

      const [escalations, total] = await Promise.all([
        this.prisma.call.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'asc' }, // Oldest first (FIFO)
          include: {
            clinic: { select: { id: true, name: true, phone: true } },
            patient: {
              select: { id: true, name: true, phone: true },
            },
          },
        }),
        this.prisma.call.count({ where }),
      ]);

      this.logger.log(`Retrieved ${escalations.length} escalations (page ${page}/${Math.ceil(total / limit)})`);

      return {
        data: escalations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting escalations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark escalation as resolved
   */
  async resolveEscalation(id: string): Promise<any> {
    try {
      const call = await this.prisma.call.findUnique({
        where: { id },
      });

      if (!call) {
        this.logger.warn(`Call not found for ID: ${id}`);
        return null;
      }

      if (!['callback', 'escalated'].includes(call.status)) {
        this.logger.warn(
          `Call ${id} is not in escalation status (current: ${call.status})`,
        );
        throw new Error('Call is not in escalation status');
      }

      // Parse existing metadata (stored as JSON string in DB)
      let existingMetadata: any = {};
      if (call.metadata) {
        try {
          existingMetadata = JSON.parse(call.metadata);
        } catch (e) {
          this.logger.warn(`Failed to parse metadata for call ${id}`);
        }
      }

      // Add resolved timestamp
      const updatedMetadata = {
        ...existingMetadata,
        resolved_at: new Date().toISOString(),
      };

      const updated = await this.prisma.call.update({
        where: { id },
        data: {
          status: 'resolved',
          metadata: JSON.stringify(updatedMetadata),
        },
      });

      this.logger.log(`Escalation resolved for call ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(
        `Error resolving escalation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(clinicId?: string): Promise<any> {
    try {
      const where: any = {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      };
      if (clinicId) where.clinic_id = clinicId;

      const [totalCalls, failedCalls, escalatedCalls, avgDuration] =
        await Promise.all([
          this.prisma.call.count({ where }),
          this.prisma.call.count({ where: { ...where, status: 'failed' } }),
          this.prisma.call.count({
            where: { ...where, status: { in: ['callback', 'escalated'] } },
          }),
          this.prisma.call.aggregate({
            where,
            _avg: { duration: true },
          }),
        ]);

      const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;
      const escalationRate =
        totalCalls > 0 ? (escalatedCalls / totalCalls) * 100 : 0;

      // Determine overall health status
      let status = 'healthy';
      const issues: string[] = [];

      if (errorRate > 10) {
        status = 'degraded';
        issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
      }
      if (escalationRate > 20) {
        status = 'degraded';
        issues.push(`High escalation rate: ${escalationRate.toFixed(2)}%`);
      }
      if (errorRate > 25) {
        status = 'critical';
      }

      this.logger.log(`System health: ${status} - Error rate: ${errorRate.toFixed(2)}%, Escalation rate: ${escalationRate.toFixed(2)}%`);

      return {
        status,
        timestamp: new Date().toISOString(),
        metrics: {
          totalCalls24h: totalCalls,
          errorRate: parseFloat(errorRate.toFixed(2)),
          escalationRate: parseFloat(escalationRate.toFixed(2)),
          avgCallDuration: avgDuration._avg.duration
            ? Math.round(avgDuration._avg.duration)
            : 0,
        },
        issues,
      };
    } catch (error) {
      this.logger.error(
        `Error getting system health: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
