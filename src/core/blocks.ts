import type { NodeId, ScreenSpec } from './ir';

export interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sidebar' | 'dashboard' | 'form' | 'chart' | 'page';
  /** shadcn component names that need to be in the template */
  dependencies: string[];
  /** Creates a ScreenSpec from this block template. */
  createScreen: (idFactory: () => NodeId) => ScreenSpec;
  /** LOGIC block content (functions, data, hooks). Rendered inside BN:LOGIC markers. */
  logic: string;
  /** Additional import lines needed by CodeNode blocks in this template. */
  extraImports: string[];
  /** Default screen name */
  defaultName: string;
  /** Default route */
  defaultRoute: string;
}
