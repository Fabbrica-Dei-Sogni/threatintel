interface TimeConfigAgo {
    [unit: string]: number; // es: { days: 10 }
}

interface TimeConfigRange {
    from: {
        [unit: string]: number;
    };
    to: {
        [unit: string]: number;
    };
    fromDate: string | null;
    toDate: string | null;
}

export type SortFields = Record<string, 1 | -1> | null;

export type TimeConfig = TimeConfigAgo | TimeConfigRange | null;
