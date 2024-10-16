import * as fs from 'fs';

export function log(file: string, message: string, service: string = '') {
    const date = new Date().toISOString();
    const cleanedMessage = `${message}`.replace(/\x1b\[[0-9;]*[mGKH]/g, '').trimEnd();
    for (const line of cleanedMessage.split('\n')) {
        fs.writeFileSync(file, `[${service}] ${date} - ${line}\r\n`, { flag: 'a+' });
    }
}