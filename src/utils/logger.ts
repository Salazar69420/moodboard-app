export const MAX_LOGS = 1000;

export interface LogEntry {
    timestamp: number;
    level: 'log' | 'info' | 'warn' | 'error';
    message: string;
}

const memoryLogs: LogEntry[] = [];

// Intercept console
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

function formatArgs(args: any[]) {
    return args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
}

export function initLogger() {
    console.log = (...args) => {
        originalLog(...args);
        addLog('log', formatArgs(args));
    };
    console.info = (...args) => {
        originalInfo(...args);
        addLog('info', formatArgs(args));
    };
    console.warn = (...args) => {
        originalWarn(...args);
        addLog('warn', formatArgs(args));
    };
    console.error = (...args) => {
        originalError(...args);
        addLog('error', formatArgs(args));
    };
}

function addLog(level: LogEntry['level'], message: string) {
    memoryLogs.push({ timestamp: Date.now(), level, message });
    if (memoryLogs.length > MAX_LOGS) {
        memoryLogs.shift();
    }
}

export function getLogs(lines: number): LogEntry[] {
    return memoryLogs.slice(-lines);
}
