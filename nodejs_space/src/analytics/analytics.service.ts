import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Time period for analytics
 */
export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Call analytics summary
 */
export interface CallAnalytics {
  period: { start: Date; end: Date };
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgDuration: number;
  totalTalkTime: number;
  peakHour: number;
  peakDay: string;
  
  // Outcomes
  outcomeBreakdown: Record<string, number>;
  bookingRate: number;
  escalationRate: number;
  spamRate: number;
  
  // Quality
  avgSentiment: number;
  avgQualityScore: number;
  satisfactionRate: number;
  
  // Efficiency
  avgResponseTime: number;
  firstCallResolution: number;
  
  // Trends
  callVolumeTrend: { date: string; count: number }[];
  sentimentTrend: { date: string; count: number }[];
}

/**
 * Appointment analytics
 */
export interface AppointmentAnalytics {
  period: { start: Date; end: Date };
  totalBooked: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  
  // Rates
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  
  // By type
  byServiceType: Record<string, number>;
  byDoctor: { name: string; count: number }[];
  
  // Revenue potential
  estimatedRevenue: number;
  lostRevenue: number;
  
  // Scheduling patterns
  popularDays: { day: string; count: number }[];
  popularTimes: { hour: number; count: number }[];
}

/**
 * Patient analytics
 */
export interface PatientAnalytics {
  totalPatients: number;
  newPatients: number;
  activePatients: number;
  overdueForCleaning: number;
  
  // Engagement
  avgVisitsPerPatient: number;
  returnRate: number;
  
  // Demographics (if available)
  insuranceBreakdown: Record<string, number>;
}

/**
 * Quality score components
 */
export interface QualityScore {
  overall: number; // 0-100
  components: {
    responsiveness: number;     // How quickly AI responded
    accuracy: number;           // Booking success rate
    empathy: number;            // Sentiment handling
    resolution: number;         // Issue resolution rate
    professionalism: number;    // Language quality
  };
  recommendations: string[];
}

/**
 * AnalyticsService - Comprehensive analytics and reporting
 * 
 * Features:
 * - Call analytics (volume, duration, outcomes)
 * - Appointment analytics (bookings, cancellations, no-shows)
 * - Patient analytics (new, returning, engagement)
 * - Quality scoring
 * - Trend analysis
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get date range for period
   */
  private getDateRange(period: AnalyticsPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = customStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = customEnd || now;
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * Get comprehensive call analytics
   */
  async getCallAnalytics(
    clinicId: string,
    period: AnalyticsPeriod = 'month',
    customStart?: Date,
    customEnd?: Date,
  ): Promise<CallAnalytics> {
    const { start, end } = this.getDateRange(period, customStart, customEnd);

    // Get all calls in period
    const calls = await this.prisma.call.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: start, lte: end },
      },
    });

    // Get outbound calls
    const outboundCalls = await this.prisma.outbound_call.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: start, lte: end },
      },
    });

    const totalCalls = calls.length;
    const inboundCalls = calls.length;
    const outboundCount = outboundCalls.length;

    // Calculate averages
    const avgDuration = totalCalls > 0
      ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls
      : 0;

    const totalTalkTime = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

    // Outcome breakdown
    const outcomeBreakdown: Record<string, number> = {};
    calls.forEach(c => {
      const outcome = c.outcome || 'unknown';
      outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;
    });

    // Calculate rates
    const bookingRate = totalCalls > 0
      ? (outcomeBreakdown['booked'] || 0) / totalCalls
      : 0;

    const escalationRate = totalCalls > 0
      ? (outcomeBreakdown['escalated'] || 0) / totalCalls
      : 0;

    const spamRate = totalCalls > 0
      ? (outcomeBreakdown['spam'] || 0) / totalCalls
      : 0;

    // Quality metrics
    const withSentiment = calls.filter(c => c.sentiment_score !== null);
    const avgSentiment = withSentiment.length > 0
      ? withSentiment.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / withSentiment.length
      : 0;

    const withQuality = calls.filter(c => c.quality_rating !== null);
    const avgQualityScore = withQuality.length > 0
      ? withQuality.reduce((sum, c) => sum + (c.quality_rating || 0), 0) / withQuality.length
      : 0;

    const satisfactionRate = withQuality.length > 0
      ? withQuality.filter(c => (c.quality_rating || 0) >= 4).length / withQuality.length
      : 0;

    // Peak analysis
    const hourCounts: number[] = new Array(24).fill(0);
    const dayCounts: Record<string, number> = {
      'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
      'Thursday': 0, 'Friday': 0, 'Saturday': 0,
    };
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    calls.forEach(c => {
      const date = new Date(c.created_at);
      hourCounts[date.getHours()]++;
      dayCounts[days[date.getDay()]]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

    // Volume trend (daily)
    const volumeTrend = this.calculateDailyTrend(calls, start, end, c => 1);
    const sentimentTrend = this.calculateDailyTrend(
      calls.filter(c => c.sentiment_score !== null),
      start,
      end,
      c => c.sentiment_score || 0,
    );

    return {
      period: { start, end },
      totalCalls: totalCalls + outboundCount,
      inboundCalls,
      outboundCalls: outboundCount,
      avgDuration,
      totalTalkTime,
      peakHour,
      peakDay,
      outcomeBreakdown,
      bookingRate,
      escalationRate,
      spamRate,
      avgSentiment,
      avgQualityScore,
      satisfactionRate,
      avgResponseTime: 0, // Would come from conversation logs
      firstCallResolution: bookingRate + (outcomeBreakdown['inquiry_answered'] || 0) / Math.max(totalCalls, 1),
      callVolumeTrend: volumeTrend,
      sentimentTrend,
    };
  }

  /**
   * Get appointment analytics
   */
  async getAppointmentAnalytics(
    clinicId: string,
    period: AnalyticsPeriod = 'month',
    customStart?: Date,
    customEnd?: Date,
  ): Promise<AppointmentAnalytics> {
    const { start, end } = this.getDateRange(period, customStart, customEnd);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: start, lte: end },
      },
      include: { doctor: true },
    });

    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;

    // Rates
    const completionRate = total > 0 ? completed / total : 0;
    const cancellationRate = total > 0 ? cancelled / total : 0;
    const noShowRate = total > 0 ? noShow / total : 0;

    // By service type
    const byServiceType: Record<string, number> = {};
    appointments.forEach(a => {
      byServiceType[a.service_type] = (byServiceType[a.service_type] || 0) + 1;
    });

    // By doctor
    const doctorCounts: Record<string, number> = {};
    appointments.forEach(a => {
      if (a.doctor) {
        doctorCounts[a.doctor.name] = (doctorCounts[a.doctor.name] || 0) + 1;
      }
    });
    const byDoctor = Object.entries(doctorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Get services for revenue estimate
    const services = await this.prisma.service.findMany({
      where: { clinic_id: clinicId },
    });
    const servicePrices: Record<string, number> = {};
    services.forEach(s => {
      servicePrices[s.service_name] = s.price;
    });

    // Estimate revenue
    let estimatedRevenue = 0;
    let lostRevenue = 0;
    appointments.forEach(a => {
      const price = servicePrices[a.service_type] || 150; // Default price
      if (a.status === 'completed') {
        estimatedRevenue += price;
      } else if (a.status === 'cancelled' || a.status === 'no_show') {
        lostRevenue += price;
      }
    });

    // Scheduling patterns
    const dayCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    appointments.forEach(a => {
      const date = new Date(a.appointment_date);
      const day = days[date.getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const popularDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    const popularTimes = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    return {
      period: { start, end },
      totalBooked: total,
      totalCompleted: completed,
      totalCancelled: cancelled,
      totalNoShow: noShow,
      completionRate,
      cancellationRate,
      noShowRate,
      byServiceType,
      byDoctor,
      estimatedRevenue,
      lostRevenue,
      popularDays,
      popularTimes,
    };
  }

  /**
   * Get patient analytics
   */
  async getPatientAnalytics(
    clinicId: string,
    period: AnalyticsPeriod = 'month',
    customStart?: Date,
    customEnd?: Date,
  ): Promise<PatientAnalytics> {
    const { start, end } = this.getDateRange(period, customStart, customEnd);

    // Total patients
    const totalPatients = await this.prisma.patient.count({
      where: { clinic_id: clinicId },
    });

    // New patients in period
    const newPatients = await this.prisma.patient.count({
      where: {
        clinic_id: clinicId,
        created_at: { gte: start, lte: end },
      },
    });

    // Active patients (visited in period)
    const patientsWithVisits = await this.prisma.patient.findMany({
      where: {
        clinic_id: clinicId,
        last_visit_date: { gte: start, lte: end },
      },
    });
    const activePatients = patientsWithVisits.length;

    // Overdue for cleaning (more than 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const overdueForCleaning = await this.prisma.patient.count({
      where: {
        clinic_id: clinicId,
        last_visit_date: { lte: sixMonthsAgo },
      },
    });

    // Average visits per patient
    const patients = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId },
      select: { total_visits: true },
    });
    const avgVisitsPerPatient = patients.length > 0
      ? patients.reduce((sum, p) => sum + (p.total_visits || 0), 0) / patients.length
      : 0;

    // Return rate (patients with more than 1 visit)
    const returningPatients = patients.filter(p => (p.total_visits || 0) > 1).length;
    const returnRate = patients.length > 0 ? returningPatients / patients.length : 0;

    // Insurance breakdown
    const allPatients = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId },
      select: { insurance_provider: true },
    });
    const insuranceBreakdown: Record<string, number> = {};
    allPatients.forEach(p => {
      const provider = p.insurance_provider || 'No Insurance';
      insuranceBreakdown[provider] = (insuranceBreakdown[provider] || 0) + 1;
    });

    return {
      totalPatients,
      newPatients,
      activePatients,
      overdueForCleaning,
      avgVisitsPerPatient,
      returnRate,
      insuranceBreakdown,
    };
  }

  /**
   * Calculate quality score for a call
   */
  async calculateQualityScore(callId: string): Promise<QualityScore> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return {
        overall: 0,
        components: {
          responsiveness: 0,
          accuracy: 0,
          empathy: 0,
          resolution: 0,
          professionalism: 0,
        },
        recommendations: ['Call not found'],
      };
    }

    // Get conversation logs for detailed analysis
    const logs = await this.prisma.conversation_log.findMany({
      where: { call_id: callId },
      orderBy: { turn_number: 'asc' },
    });

    // Calculate component scores
    const components = {
      responsiveness: this.calculateResponsivenessScore(logs),
      accuracy: this.calculateAccuracyScore(call),
      empathy: this.calculateEmpathyScore(call, logs),
      resolution: this.calculateResolutionScore(call),
      professionalism: this.calculateProfessionalismScore(logs),
    };

    // Calculate overall (weighted average)
    const weights = {
      responsiveness: 0.15,
      accuracy: 0.25,
      empathy: 0.20,
      resolution: 0.25,
      professionalism: 0.15,
    };

    const overall = Object.entries(components).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0,
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (components.responsiveness < 70) {
      recommendations.push('Improve response time - aim for < 2 seconds');
    }
    if (components.accuracy < 70) {
      recommendations.push('Review booking flow accuracy');
    }
    if (components.empathy < 70) {
      recommendations.push('Enhance empathetic responses for patient concerns');
    }
    if (components.resolution < 70) {
      recommendations.push('Focus on first-call resolution');
    }
    if (components.professionalism < 70) {
      recommendations.push('Review and improve response language');
    }

    return { overall, components, recommendations };
  }

  /**
   * Get aggregate quality score for clinic
   */
  async getAggregateQualityScore(
    clinicId: string,
    period: AnalyticsPeriod = 'month',
  ): Promise<QualityScore & { sampleSize: number }> {
    const { start, end } = this.getDateRange(period);

    const calls = await this.prisma.call.findMany({
      where: {
        clinic_id: clinicId,
        created_at: { gte: start, lte: end },
        quality_rating: { not: null },
      },
      take: 100, // Sample
    });

    if (calls.length === 0) {
      return {
        overall: 0,
        components: {
          responsiveness: 0,
          accuracy: 0,
          empathy: 0,
          resolution: 0,
          professionalism: 0,
        },
        recommendations: ['No rated calls in period'],
        sampleSize: 0,
      };
    }

    // Calculate average scores
    const scores = await Promise.all(
      calls.map(c => this.calculateQualityScore(c.id)),
    );

    const avgComponents = {
      responsiveness: this.avg(scores.map(s => s.components.responsiveness)),
      accuracy: this.avg(scores.map(s => s.components.accuracy)),
      empathy: this.avg(scores.map(s => s.components.empathy)),
      resolution: this.avg(scores.map(s => s.components.resolution)),
      professionalism: this.avg(scores.map(s => s.components.professionalism)),
    };

    const overall = this.avg(scores.map(s => s.overall));

    // Aggregate recommendations
    const allRecs = scores.flatMap(s => s.recommendations);
    const recCounts: Record<string, number> = {};
    allRecs.forEach(r => {
      recCounts[r] = (recCounts[r] || 0) + 1;
    });
    const recommendations = Object.entries(recCounts)
      .filter(([_, count]) => count >= scores.length * 0.3) // At least 30% of calls
      .map(([rec]) => rec);

    return {
      overall,
      components: avgComponents,
      recommendations,
      sampleSize: scores.length,
    };
  }

  // Helper methods
  private calculateDailyTrend(
    items: any[],
    start: Date,
    end: Date,
    getValue: (item: any) => number,
  ): { date: string; count: number }[] {
    const trend: Record<string, { sum: number; count: number }> = {};
    
    // Initialize all days
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      trend[dateStr] = { sum: 0, count: 0 };
      current.setDate(current.getDate() + 1);
    }

    // Populate with data
    items.forEach(item => {
      const dateStr = new Date(item.created_at).toISOString().split('T')[0];
      if (trend[dateStr]) {
        trend[dateStr].sum += getValue(item);
        trend[dateStr].count++;
      }
    });

    return Object.entries(trend).map(([date, data]) => ({
      date,
      count: data.count > 0 ? data.sum / data.count : 0,
    }));
  }

  private calculateResponsivenessScore(logs: any[]): number {
    const responseTimes = logs
      .filter(l => l.response_time_ms !== null)
      .map(l => l.response_time_ms);
    
    if (responseTimes.length === 0) return 80; // Default

    const avgResponseTime = this.avg(responseTimes);
    // Score: 100 if < 1s, 80 if < 2s, 60 if < 3s, 40 if < 5s, 20 otherwise
    if (avgResponseTime < 1000) return 100;
    if (avgResponseTime < 2000) return 80;
    if (avgResponseTime < 3000) return 60;
    if (avgResponseTime < 5000) return 40;
    return 20;
  }

  private calculateAccuracyScore(call: any): number {
    // Based on outcome
    switch (call.outcome) {
      case 'booked':
      case 'rescheduled':
        return 100;
      case 'inquiry_answered':
        return 85;
      case 'escalated':
        return 50;
      case 'cancelled':
        return 70;
      case 'spam':
        return 90; // Correctly identified spam
      default:
        return 60;
    }
  }

  private calculateEmpathyScore(call: any, logs: any[]): number {
    // Based on sentiment progression
    const sentiments = logs
      .filter(l => l.confidence_score !== null)
      .map(l => l.confidence_score);
    
    if (sentiments.length < 2) {
      // Use call sentiment
      const sentiment = call.sentiment_score || 0;
      return Math.round((sentiment + 1) * 50); // Convert -1..1 to 0..100
    }

    // Check if sentiment improved over conversation
    const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
    const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));
    
    const firstAvg = this.avg(firstHalf);
    const secondAvg = this.avg(secondHalf);
    
    if (secondAvg > firstAvg) return 90; // Improved
    if (secondAvg >= firstAvg - 0.1) return 70; // Maintained
    return 50; // Declined
  }

  private calculateResolutionScore(call: any): number {
    switch (call.outcome) {
      case 'booked':
        return 100;
      case 'rescheduled':
        return 95;
      case 'inquiry_answered':
        return 90;
      case 'cancelled':
        return 80; // Patient got what they wanted
      case 'escalated':
        return 40;
      default:
        return 50;
    }
  }

  private calculateProfessionalismScore(logs: any[]): number {
    // Would analyze language in production
    // For now, return high score if conversation completed normally
    return logs.length > 2 ? 85 : 60;
  }

  private avg(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}
