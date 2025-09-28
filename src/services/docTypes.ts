import * as yaml from 'js-yaml';

export type DetectedDocType = 'requirements' | 'stakeholders' | 'design' | 'tasks' | 'unknown';

export interface RequirementItem {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  relatesTo?: Array<{ type: string; id: string }>;
  tags?: string[];
  notes?: string;
}

export interface GlossaryItem {
  id?: string;
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export interface TraceabilityItem {
  id: string;
  type: string;
  relatedItems: Array<{ type: string; id: string }>;
}

export interface RequirementsDoc {
  title: string;
  version: string;
  goals?: string[];
  userRequirements?: RequirementItem[];
  systemRequirements: RequirementItem[];
  nonFunctionalRequirements?: RequirementItem[];
  glossary?: GlossaryItem[];
  traceability?: TraceabilityItem[];
}

export interface StakeholderItem {
  id?: string;
  name: string;
  role?: string;
  contact?: string;
  availability?: string;
  responsibilities?: string;
  components?: string[];
  notes?: string;
}

export interface StakeholdersDoc {
  title: string;
  version: string;
  stakeholders: StakeholderItem[];
}

export interface ComponentItem {
  id?: string;
  name: string;
  type?: string;
  description?: string;
  responsibilities?: string;
  interfaces?: string[];
  dependencies?: string[];
  dataModels?: string[];
  techStack?: string[];
  criticality?: string;
  risks?: string[];
  children?: ComponentItem[];
  notes?: string;
}

export interface DesignDoc {
  title: string;
  version: string;
  components: ComponentItem[];
}

export interface TaskItem {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: string;
  dueDate?: string | Date;
  relatesTo?: Array<{ type: string; id: string }>;
  tags?: string[];
  notes?: string;
  children?: TaskItem[];
}

export interface TasksDoc {
  title: string;
  version: string;
  epics: TaskItem[];
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

