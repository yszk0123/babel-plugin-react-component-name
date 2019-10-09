import { NodePath, PluginObj } from '@babel/core';
import template from '@babel/template';
import * as types from '@babel/types';

const buildDefinition = template(`
Object.defineProperty(COMPONENT, "name", {
  value: COMPONENT_NAME
});
`);

export default ({ types: t }: { types: typeof types }): PluginObj => ({
  name: 'babel-plubin-react-component-name',
  visitor: {
    Program(path) {
      if (!path.scope.hasBinding('React')) {
        return;
      }

      const definitions: any[] = [];

      path.traverse({
        ExportNamedDeclaration(path) {
          const componentName = getComponentName(path);
          if (componentName) {
            const definition = buildDefinition({
              COMPONENT: t.identifier(componentName),
              COMPONENT_NAME: t.stringLiteral(componentName),
            });
            definitions.push(definition);
          }
        },
      });

      path.node.body.push(...definitions);
    },
  },
});

function getComponentName(path: NodePath<types.ExportNamedDeclaration>) {
  if (!types.isVariableDeclaration(path.node.declaration)) {
    return null;
  }

  const declaration = path.node.declaration.declarations[0];
  if (!declaration || !types.isIdentifier(declaration.id)) {
    return null;
  }

  return declaration.id.name;
}
