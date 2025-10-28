export class CsvUtils {
	static parseCsvLine(line: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			const nextChar = i < line.length - 1 ? line[i + 1] : null;

			if (char === '"') {
				if (inQuotes && nextChar === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
		}

		result.push(current.trim());
		return result;
	}

	static findColumnIndex(header: string[], columnName: string): number {
		return header.findIndex((h) => h.toLowerCase() === columnName.toLowerCase());
	}

	static parseCsv(csv: string): string[][] {
		const lines = csv.split('\n').filter((line) => line.trim());
		return lines.map((line) => this.parseCsvLine(line));
	}
}
