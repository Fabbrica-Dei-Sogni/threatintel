import { PipelineStage } from '../PipelineStage';

export class TimeFilterStage implements PipelineStage {
    constructor(private readonly timeConfig: any) { }

    generate(): any[] {
        if (!this.timeConfig) return [];

        const now = new Date();
        let timeAgo: Date | null = null;
        let timeToStart: Date | null = null;

        const parseDate = (d: any) => {
            if (d instanceof Date) return d;
            if (typeof d === 'string') {
                const parsed = new Date(d);
                return isNaN(parsed.getTime()) ? null : parsed;
            }
            return null;
        };

        const fromStr = this.timeConfig.fromDate || this.timeConfig.startTime || this.timeConfig.start;
        const toStr = this.timeConfig.toDate || this.timeConfig.endTime || this.timeConfig.end;

        // Gestione intervallo da date assolute (prioritaria se presenti)
        if (fromStr || toStr) {
            if (fromStr) timeAgo = parseDate(fromStr);
            if (toStr) {
                const toDateParsed = parseDate(toStr);
                if (toDateParsed) {
                    // Se la data è solo YYYY-MM-DD, impostiamo alla fine del giorno
                    if (typeof toStr === 'string' && toStr.length <= 10) {
                        toDateParsed.setHours(23, 59, 59, 999);
                    }
                    timeToStart = toDateParsed;
                }
            }
        } else {
            // Caso 1: Solo periodo finale (timeAgo) - dal passato ad ora
            const minutes = this.timeConfig.minutes || this.timeConfig.m;
            const hours = this.timeConfig.hours || this.timeConfig.h;
            const days = this.timeConfig.days || this.timeConfig.d;
            const months = this.timeConfig.months || this.timeConfig.M;
            const years = this.timeConfig.years || this.timeConfig.y;

            if (minutes || hours || days || months || years) {
                if (minutes) {
                    timeAgo = new Date(now.getTime() - (minutes * 60 * 1000));
                } else if (hours) {
                    timeAgo = new Date(now.getTime() - (hours * 60 * 60 * 1000));
                } else if (days) {
                    timeAgo = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                } else if (months) {
                    timeAgo = new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000));
                } else if (years) {
                    timeAgo = new Date(now.getTime() - (years * 365 * 24 * 60 * 60 * 1000));
                }
            }
            // Caso 2: Finestra temporale precisa con 'from' e 'to'
            else if (this.timeConfig.from && this.timeConfig.to) {
                const fMin = this.timeConfig.from.minutes || this.timeConfig.from.m;
                const fHour = this.timeConfig.from.hours || this.timeConfig.from.h;
                const fDay = this.timeConfig.from.days || this.timeConfig.from.d;

                if (fMin) timeAgo = new Date(now.getTime() - (fMin * 60 * 1000));
                else if (fHour) timeAgo = new Date(now.getTime() - (fHour * 60 * 60 * 1000));
                else if (fDay) timeAgo = new Date(now.getTime() - (fDay * 24 * 60 * 60 * 1000));

                const tMin = this.timeConfig.to.minutes || this.timeConfig.to.m;
                const tHour = this.timeConfig.to.hours || this.timeConfig.to.h;
                const tDay = this.timeConfig.to.days || this.timeConfig.to.d;

                if (tMin) timeToStart = new Date(now.getTime() - (tMin * 60 * 1000));
                else if (tHour) timeToStart = new Date(now.getTime() - (tHour * 60 * 60 * 1000));
                else if (tDay) timeToStart = new Date(now.getTime() - (tDay * 24 * 60 * 60 * 1000));
            }
            // Caso 3: Solo 'from'
            else if (this.timeConfig.from) {
                const fMin = this.timeConfig.from.minutes || this.timeConfig.from.m;
                const fHour = this.timeConfig.from.hours || this.timeConfig.from.h;
                const fDay = this.timeConfig.from.days || this.timeConfig.from.d;

                if (fMin) timeAgo = new Date(now.getTime() - (fMin * 60 * 1000));
                else if (fHour) timeAgo = new Date(now.getTime() - (fHour * 60 * 60 * 1000));
                else if (fDay) timeAgo = new Date(now.getTime() - (fDay * 24 * 60 * 60 * 1000));
            }
            // Caso 4: Solo 'to'
            else if (this.timeConfig.to) {
                const tMin = this.timeConfig.to.minutes || this.timeConfig.to.m;
                const tHour = this.timeConfig.to.hours || this.timeConfig.to.h;
                const tDay = this.timeConfig.to.days || this.timeConfig.to.d;

                if (tMin) timeToStart = new Date(now.getTime() - (tMin * 60 * 1000));
                else if (tHour) timeToStart = new Date(now.getTime() - (tHour * 60 * 60 * 1000));
                else if (tDay) timeToStart = new Date(now.getTime() - (tDay * 24 * 60 * 60 * 1000));
            }
        }

        let timeFilter: any = {};
        if (timeAgo && timeToStart) {
            timeFilter = { timestamp: { $gte: timeAgo, $lte: timeToStart } };
        } else if (timeAgo) {
            timeFilter = { timestamp: { $gte: timeAgo } };
        } else if (timeToStart) {
            timeFilter = { timestamp: { $lte: timeToStart } };
        }

        return Object.keys(timeFilter).length > 0 ? [{ $match: timeFilter }] : [];
    }
}
