import { NodePath, PluginObj } from '@babel/core';
import template from '@babel/template';
import * as types from '@babel/types';

const UPPER_PATTERN = /^[A-Z]/;

const buildDefinition = template(`
Object.defineProperty(COMPONENT, "name", {
  value: COMPONENT_NAME
});
`);

const buildDefinitionForTypeScript = template(`
Object.defineProperty(exports.COMPONENT, "name", {
  value: COMPONENT_NAME
});
`);

export default ({ types: t }: { types: typeof types }): PluginObj => ({
  name: 'babel-plubin-react-component-name',
  visitor: {
    Program(path) {
      if (
        !path.scope.hasBinding('React') &&
        !path.scope.hasBinding('react_1')
      ) {
        return;
      }

      const definitions: any[] = [];

      path.traverse({
        ExportNamedDeclaration(path) {
          const componentName = getComponentName(path);
          if (isValidComponentName(componentName)) {
            const definition = buildDefinition({
              COMPONENT: t.identifier(componentName),
              COMPONENT_NAME: t.stringLiteral(componentName),
            });
            definitions.push(definition);
          }
        },
        AssignmentExpression(path) {
          const componentName = getComponentNameForTypeScript(path);
          if (isValidComponentName(componentName)) {
            const definition = buildDefinitionForTypeScript({
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

function isValidComponentName(
  componentName: string | null | undefined,
): componentName is string {
  return !!componentName && UPPER_PATTERN.test(componentName);
}

function getComponentNameForTypeScript(path: NodePath<types.AssignmentExpression>) {
  const expression = path.node.left;
  if (
    !types.isMemberExpression(expression) ||
    !types.isIdentifier(expression.object) ||
    !types.isIdentifier(expression.property) ||
    expression.object.name !== 'exports'
  ) {
    return;
  }
  if (!types.isFunctionExpression(path.node.right)) {
    return;
  }
  return expression.property.name;
}
