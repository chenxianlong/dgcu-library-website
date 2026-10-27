import Markdoc from '@markdoc/markdoc';

const alignmentTag = {
  attributes: {
    position: {
      type: String,
      default: 'left',
      matches: ['left', 'center', 'right'],
      errorLevel: 'critical' as const,
    },
  },
  transform(node: any, config: any) {
    const attributes = node.transformAttributes(config);
    const position = ['left', 'center', 'right'].includes(attributes.position) ? attributes.position : 'left';
    return new Markdoc.Tag('div', { class: `article-align article-align-${position}` }, node.transformChildren(config));
  },
};

export function renderMarkdown(content: string) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast, {
    nodes: {
      softbreak: { render: 'br' },
    },
    tags: {
      align: alignmentTag,
    },
  });
  return Markdoc.renderers.html(transformed);
}
