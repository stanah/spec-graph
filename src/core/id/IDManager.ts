import { nanoid as defaultNanoid, customAlphabet } from 'nanoid';

export type IDManagerOptions = {
  prefix?: string;
  auto?: boolean; // default: true
  size?: number; // default: nanoid default (21)
  alphabet?: string; // if provided, use custom alphabet
};

export class IDManager {
  private prefix?: string;
  private auto: boolean;
  private size?: number;
  private alphabet?: string;

  constructor(options: IDManagerOptions = {}) {
    const { prefix, auto = true, size, alphabet } = options;
    this.prefix = prefix;
    this.auto = auto;
    this.size = size;
    this.alphabet = alphabet;
  }

  setAuto(auto: boolean) {
    this.auto = auto;
  }

  setPrefix(prefix?: string) {
    this.prefix = prefix;
  }

  /**
   * Generate a new ID using nanoid and apply prefix if configured.
   */
  generate(): string {
    const gen = this.getGenerator();
    const id = gen();
    return this.applyPrefix(id);
  }

  /**
   * Assign an ID. If a manual id is provided, it is normalized and returned.
   * If not provided, respects the auto flag to generate or throw.
   */
  assign(id?: string): string {
    if (id != null) {
      return this.normalizeManual(id);
    }
    if (this.auto) {
      return this.generate();
    }
    throw new Error('IDManager: auto generation is disabled; manual id is required');
  }

  hasPrefix(id: string): boolean {
    return !!this.prefix && id.startsWith(this.prefix);
  }

  stripPrefix(id: string): string {
    if (this.hasPrefix(id)) {
      return id.slice(this.prefix!.length);
    }
    return id;
  }

  private normalizeManual(id: string): string {
    // Avoid double prefixing if the given id already contains the prefix
    if (this.hasPrefix(id)) return id;
    return this.applyPrefix(id);
  }

  private applyPrefix(id: string): string {
    if (!this.prefix) return id;
    return `${this.prefix}${id}`;
  }

  private getGenerator(): () => string {
    if (this.alphabet) {
      return customAlphabet(this.alphabet, this.size ?? undefined);
    }
    if (this.size) {
      return () => defaultNanoid(this.size);
    }
    return () => defaultNanoid();
  }
}

