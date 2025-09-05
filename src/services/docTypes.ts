import * as yaml from 'js-yaml';

export type DetectedDocType = 'requirements' | 'stakeholders' | 'design' | 'tasks' | 'unknown';

export interface RequirementsDoc {
  title: string;
  version: string;
  goals?: string[];
  userRequirements?: any[];
  systemRequirements: any[];
  nonFunctionalRequirements?: any[];
  glossary?: any[];
  traceability?: any[];
}

export interface StakeholdersDoc {
  title: string;
  version: string;
  stakeholders: any[];
}

export interface DesignDoc {
  title: string;
  version: string;
  components: any[];
}

export interface TasksDoc {
  title: string;
  version: string;
  epics: any[];
}

export type AnyDoc = RequirementsDoc | StakeholdersDoc | DesignDoc | TasksDoc | Record<string, unknown>;

export function parseAny(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) return {};
  try {
    // try JSON
    return JSON.parse(trimmed);
  } catch {
    // try YAML
    return yaml.load(trimmed, { schema: yaml.JSON_SCHEMA });
  }
}

export function detectDocType(data: unknown): DetectedDocType {
  if (!data || typeof data !== 'object') return 'unknown';
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.systemRequirements) || Array.isArray(obj.userRequirements) || Array.isArray(obj.nonFunctionalRequirements)) {
    return 'requirements';
  }
  if (Array.isArray(obj.stakeholders)) return 'stakeholders';
  if (Array.isArray(obj.components)) return 'design';
  if (Array.isArray(obj.epics)) return 'tasks';
  return 'unknown';
}

