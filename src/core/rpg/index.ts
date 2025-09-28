/**
 * Repository Planning Graph (RPG) Core Module
 * Export all public interfaces and types
 */

// Core types and enums
export {
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus,
  type RPGBaseAttributes,
  type RPGNode,
  type RPGEdge,
  type RPGGraph,
  type RPGConstructionOptions,
  type RPGNodeQuery,
  type RPGEdgeQuery,
  type RPGValidationResult,
  type RPGSerializationFormat
} from './types';

// Core interfaces
export {
  type IRPGNodeManager,
  type IRPGEdgeManager,
  type IRPGGraphManager,
  type IRPGHierarchyManager,
  type IRPGDependencyManager,
  type IRPGConstructor,
  type IRPGPersistence,
  type IRPGCoreEngine,
  type IRPGFactory
} from './interfaces';

// Core implementation
export { RPGCoreEngine } from './RPGCoreEngine';

// Factory function for convenience
export const createRPGEngine = async (options?: RPGConstructionOptions): Promise<RPGCoreEngine> => {
  const engine = new RPGCoreEngine(undefined, undefined, options);
  await engine.initialize(options);
  return engine;
};