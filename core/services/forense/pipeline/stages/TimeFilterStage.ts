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

        // Gestione intervallo da fromDate e toDate (prioritaria se presenti)
        if (this.timeConfig.fromDate && this.timeConfig.toDate) {
            timeAgo = parseDate(this.timeConfig.fromDate);
            const toDateParsed = parseDate(this.timeConfig.toDate);
            if (toDateParsed) {
                // End of day for toDate if it came from date picker string
                toDateParsed.setHours(23, 59, 59, 999);
                timeToStart = toDateParsed;
            }
        } else if (this.timeConfig.fromDate) {
            timeAgo = parseDate(this.timeConfig.fromDate);
        } else if (this.timeConfig.toDate) {
            const toDateParsed = parseDate(this.timeConfig.toDate);
            if (toDateParsed) {
                toDateParsed.setHours(23, 59, 59, 999);
                timeToStart = toDateParsed;
            }
        } else {
            // Caso 1: Solo periodo finale (timeAgo) - dal passato ad ora
            if (this.timeConfig.minutes || this.timeConfig.hours || this.timeConfig.days || this.timeConfig.months || this.timeConfig.years) {
                if (this.timeConfig.minutes) {
                    timeAgo = new Date(now.getTime() - (this.timeConfig.minutes * 60 * 1000));
                } else if (this.timeConfig.hours) {
                    timeAgo = new Date(now.getTime() - (this.timeConfig.hours * 60 * 60 * 1000));
                } else if (this.timeConfig.days) {
                    timeAgo = new Date(now.getTime() - (this.timeConfig.days * 24 * 60 * 60 * 1000));
                } else if (this.timeConfig.months) {
                    timeAgo = new Date(now.getTime() - (this.timeConfig.months * 30 * 24 * 60 * 60 * 1000));
                } else if (this.timeConfig.years) {
                    timeAgo = new Date(now.getTime() - (this.timeConfig.years * 365 * 24 * 60 * 60 * 1000));
                }
            }
            // Caso 2: Finestra temporale precisa con 'from' e 'to'
            else if (this.timeConfig.from && this.timeConfig.to) {
                if (this.timeConfig.from.minutes) timeAgo = new Date(now.getTime() - (this.timeConfig.from.minutes * 60 * 1000));
                else if (this.timeConfig.from.hours) timeAgo = new Date(now.getTime() - (this.timeConfig.from.hours * 60 * 60 * 1000));
                else if (this.timeConfig.from.days) timeAgo = new Date(now.getTime() - (this.timeConfig.from.days * 24 * 60 * 60 * 1000));

                if (this.timeConfig.to.minutes) timeToStart = new Date(now.getTime() - (this.timeConfig.to.minutes * 60 * 1000));
                else if (this.timeConfig.to.hours) timeToStart = new Date(now.getTime() - (this.timeConfig.to.hours * 60 * 60 * 1000));
                else if (this.timeConfig.to.days) timeToStart = new Date(now.getTime() - (this.timeConfig.to.days * 24 * 60 * 60 * 1000));
            }
            // Caso 3: Solo 'from'
            else if (this.timeConfig.from) {
                if (this.timeConfig.from.minutes) timeAgo = new Date(now.getTime() - (this.timeConfig.from.minutes * 60 * 1000));
                else if (this.timeConfig.from.hours) timeAgo = new Date(now.getTime() - (this.timeConfig.from.hours * 60 * 60 * 1000));
                else if (this.timeConfig.from.days) timeAgo = new Date(now.getTime() - (this.timeConfig.from.days * 24 * 60 * 60 * 1000));
            }
            // Caso 4: Solo 'to'
            else if (this.timeConfig.to) {
                if (this.timeConfig.to.minutes) timeToStart = new Date(now.getTime() - (this.timeConfig.to.minutes * 60 * 1000));
                else if (this.timeConfig.to.hours) timeToStart = new Date(now.getTime() - (this.timeConfig.to.hours * 60 * 60 * 1000));
                else if (this.timeConfig.to.days) timeToStart = new Date(now.getTime() - (this.timeConfig.to.days * 24 * 60 * 60 * 1000));
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
