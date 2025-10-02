/**
 * Default Handlebars helpers for code generation
 */

/**
 * Convert string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_match, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^[A-Z]/, chr => chr.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
export function pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to snake_case
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[-\s]+/g, '_');
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[_\s]+/g, '-');
}

/**
 * Join array elements with separator
 */
export function join(arr: any[], separator: string = ', '): string {
  if (!Array.isArray(arr)) {
    return '';
  }
  return arr.join(separator);
}

/**
 * Equality comparison
 */
export function eq(a: any, b: any): boolean {
  return a === b;
}

/**
 * Not equality comparison
 */
export function neq(a: any, b: any): boolean {
  return a !== b;
}

/**
 * Greater than comparison
 */
export function gt(a: number, b: number): boolean {
  return a > b;
}

/**
 * Less than comparison
 */
export function lt(a: number, b: number): boolean {
  return a < b;
}

/**
 * Logical AND
 */
export function and(...args: any[]): boolean {
  // Remove the Handlebars options object (last argument)
  const values = args.slice(0, -1);
  return values.every(Boolean);
}

/**
 * Logical OR
 */
export function or(...args: any[]): boolean {
  // Remove the Handlebars options object (last argument)
  const values = args.slice(0, -1);
  return values.some(Boolean);
}

/**
 * Logical NOT
 */
export function not(value: any): boolean {
  return !value;
}

/**
 * Uppercase first letter
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Lowercase first letter
 */
export function uncapitalize(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Uppercase entire string
 */
export function upper(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.toUpperCase();
}

/**
 * Lowercase entire string
 */
export function lower(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.toLowerCase();
}

/**
 * Indent text by specified number of spaces
 */
export function indent(text: string, spaces: number = 2): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  const indentation = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line.trim() ? indentation + line : line))
    .join('\n');
}

/**
 * Default helpers collection
 */
export const defaultHelpers = {
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  join,
  eq,
  neq,
  gt,
  lt,
  and,
  or,
  not,
  capitalize,
  uncapitalize,
  upper,
  lower,
  indent,
};
